import { Context } from 'hono';
import { Env } from '../types';
import { AppError } from '../utils/AppError';

interface ClassPerformance {
    avgScore: number;
    passRate: number;
    excellentRate: number;
    weakSubjects: string[];
    strongSubjects: string[];
}

interface LessonPlanContext {
    catalogId: number;
    unitName: string;
    lessonName?: string;
    subject: string;
    grade: number;
    volume: number;
    classId?: number;
    classPerformance?: ClassPerformance;
    textbookContent?: string;
    customTopic?: string;
}

export class LessonPrepService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    /**
     * 从 Vectorize 检索相关教材内容
     */
    async retrieveTextbookContent(
        subject: string,
        grade: number,
        volume: number,
        query: string
    ): Promise<string[]> {
        // 生成查询向量
        const queryEmbedding = await this.env.AI.run('@cf/baai/bge-m3', {
            text: [query]
        }) as { data: number[][] };

        // 在 Vectorize 中搜索
        const results = await this.env.VECTORIZE.query(queryEmbedding.data[0], {
            topK: 5,
            filter: {
                subject: { $eq: subject },
                grade: { $eq: String(grade) },
                volume: { $eq: String(volume) }
            },
            returnMetadata: 'all'
        });

        // 提取相关内容
        return results.matches.map(match => {
            const meta = match.metadata as Record<string, string>;
            return `${meta.unit || ''} ${meta.lesson || ''}`;
        });
    }

    /**
     * 获取班级学情数据
     */
    async getClassPerformance(classId: number): Promise<ClassPerformance | null> {
        // 获取最近一次考试的统计数据
        const stats = await this.env.DB.prepare(`
      SELECT 
        c.name as subject,
        AVG(s.score) as avg_score,
        COUNT(CASE WHEN s.score >= 60 THEN 1 END) * 100.0 / COUNT(*) as pass_rate,
        COUNT(CASE WHEN s.score >= 85 THEN 1 END) * 100.0 / COUNT(*) as excellent_rate
      FROM scores s
      JOIN courses c ON s.course_id = c.id
      JOIN students st ON s.student_id = st.id
      JOIN exams e ON s.exam_id = e.id
      WHERE st.class_id = ?
      AND e.id = (
        SELECT e2.id FROM exams e2
        JOIN scores s2 ON e2.id = s2.exam_id
        JOIN students st2 ON s2.student_id = st2.id
        WHERE st2.class_id = ?
        ORDER BY e2.exam_date DESC LIMIT 1
      )
      GROUP BY c.id
    `).bind(classId, classId).all();

        if (!stats.results?.length) return null;

        const subjects = stats.results as any[];
        const avgScore = subjects.reduce((sum, s) => sum + s.avg_score, 0) / subjects.length;
        const passRate = subjects.reduce((sum, s) => sum + s.pass_rate, 0) / subjects.length;
        const excellentRate = subjects.reduce((sum, s) => sum + s.excellent_rate, 0) / subjects.length;

        const weakSubjects = subjects
            .filter(s => s.avg_score < 70)
            .map(s => s.subject);
        const strongSubjects = subjects
            .filter(s => s.avg_score >= 85)
            .map(s => s.subject);

        return { avgScore, passRate, excellentRate, weakSubjects, strongSubjects };
    }

    /**
     * 生成教案（非流式）
     */
    async generateLessonPlan(context: LessonPlanContext): Promise<string> {
        const { systemPrompt, userPrompt } = this.buildPrompts(context);

        const apiKey = this.env.DASHSCOPE_API_KEY;
        if (!apiKey) throw new AppError('DASHSCOPE_API_KEY not configured', 500);

        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-ai/DeepSeek-V3.2',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            throw new AppError(`AI API error: ${response.status}`, 500);
        }

        const data: any = await response.json();
        return data.choices?.[0]?.message?.content || '生成失败';
    }

    /**
     * 生成教案（流式）
     */
    async generateLessonPlanStream(c: Context, context: LessonPlanContext): Promise<Response> {
        const { systemPrompt, userPrompt } = this.buildPrompts(context);

        const apiKey = this.env.DASHSCOPE_API_KEY;
        if (!apiKey) throw new AppError('DASHSCOPE_API_KEY not configured', 500);

        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-ai/DeepSeek-V3.2',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                stream: true
            })
        });

        if (!response.ok || !response.body) {
            throw new AppError(`AI API error: ${response.status}`, 500);
        }

        return new Response(response.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });
    }

    /**
     * 构建 AI 提示词
     */
    private buildPrompts(context: LessonPlanContext): { systemPrompt: string; userPrompt: string } {
        const subjectNames: Record<string, string> = {
            math: '数学',
            chinese: '语文',
            english: '英语',
            custom: '小学'
        };

        const systemPrompt = `你是一位经验丰富的小学${subjectNames[context.subject] || ''}教师，擅长根据学生实际情况设计个性化教案。
请生成规范的教学设计。

教案格式要求：
1. 教学目标（知识与技能、过程与方法、情感态度）
2. 教学重难点
3. 教学准备
4. 教学过程（导入、新授、练习、小结）
5. 板书设计
6. 课后作业
7. 教学反思（留空）`;

        let userPrompt: string;

        // 如果是自定义主题
        if (context.customTopic) {
            userPrompt = `## 备课主题\n${context.customTopic}`;
        } else {
            userPrompt = `## 教学内容
- 年级：${context.grade}年级
- 册次：${context.volume === 1 ? '上册' : '下册'}
- 单元：${context.unitName}
${context.lessonName ? `- 课时：${context.lessonName}` : ''}`;
        }

        if (context.textbookContent) {
            userPrompt += `\n\n## 教材参考\n${context.textbookContent}`;
        }

        if (context.classPerformance) {
            const perf = context.classPerformance;
            userPrompt += `\n\n## 班级学情
- 班级均分：${perf.avgScore.toFixed(1)}
- 及格率：${perf.passRate.toFixed(1)}%
- 优秀率：${perf.excellentRate.toFixed(1)}%`;

            if (perf.weakSubjects.length > 0) {
                userPrompt += `\n- 薄弱科目：${perf.weakSubjects.join('、')}`;
            }
            if (perf.strongSubjects.length > 0) {
                userPrompt += `\n- 优势科目：${perf.strongSubjects.join('、')}`;
            }

            userPrompt += `\n\n请根据以上学情，适当调整教学难度和练习设计。`;
        }

        userPrompt += `\n\n请生成完整的教学设计（约800-1000字）。`;

        return { systemPrompt, userPrompt };
    }

    /**
     * 保存教案
     */
    async saveLessonPlan(
        userId: number,
        catalogId: number,
        title: string,
        content: string,
        classId?: number
    ): Promise<number> {
        const result = await this.env.DB.prepare(`
      INSERT INTO lesson_plans (user_id, catalog_id, class_id, title, content, is_draft)
      VALUES (?, ?, ?, ?, ?, 0)
    `).bind(userId, catalogId, classId || null, title, content).run();

        return result.meta.last_row_id as number;
    }

    /**
     * 获取用户的教案列表
     */
    async getUserLessonPlans(userId: number): Promise<any[]> {
        const result = await this.env.DB.prepare(`
      SELECT lp.*, tc.subject, tc.grade, tc.volume, tc.unit_name
      FROM lesson_plans lp
      JOIN textbook_catalog tc ON lp.catalog_id = tc.id
      WHERE lp.user_id = ?
      ORDER BY lp.updated_at DESC
    `).bind(userId).all();

        return result.results || [];
    }
}
