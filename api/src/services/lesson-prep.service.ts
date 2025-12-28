import { Context } from 'hono';
import { Env } from '../types';
import { AppError } from '../utils/AppError';
import { checkAndIncrementQuota } from '../utils/aiQuota';

interface ClassPerformance {
    avgScore: number;
    passRate: number;
    excellentRate: number;
    weakSubjects: string[];
    strongSubjects: string[];
}

interface LessonPlanContext {
    subject: string;
    grade: number;
    volume: number;
    topic: string;
    classId?: number;
    classPerformance?: ClassPerformance;
}

export class LessonPrepService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    /**
     * 获取班级学情数据
     */
    async getClassPerformance(classId: number): Promise<ClassPerformance | null> {
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
     * 生成教案（流式）- 纯 LLM 方式
     */
    async generateLessonPlanStream(c: Context, context: LessonPlanContext): Promise<Response> {
        const { systemPrompt, userPrompt } = this.buildPrompts(context);
        return this.callLLM(systemPrompt, userPrompt, true) as Promise<Response>;
    }

    /**
     * 构建 AI 提示词
     */
    private buildPrompts(context: LessonPlanContext): { systemPrompt: string; userPrompt: string } {
        const subjectNames: Record<string, string> = {
            math: '数学',
            chinese: '语文',
            english: '英语'
        };

        const gradeNames = ['', '一', '二', '三', '四', '五', '六'];
        const volumeNames = ['', '上', '下'];

        const subjectName = subjectNames[context.subject] || context.subject;
        const gradeName = gradeNames[context.grade] || context.grade;
        const volumeName = volumeNames[context.volume] || '';

        const systemPrompt = `你是一位经验丰富的小学${subjectName}教师，拥有丰富的教学经验和专业知识。
你熟悉人教版、北师大版、苏教版等主流小学教材内容。
请根据教学内容和班级情况，设计详细、专业的教学方案。

教案格式要求：
# 教学设计

## 一、教学目标
### 知识与技能
### 过程与方法  
### 情感态度与价值观

## 二、教学重难点
### 教学重点
### 教学难点

## 三、教学准备
(教师准备、学生准备、教学资源)

## 四、教学过程
### 1. 导入新课（约5分钟）
### 2. 新知探究（约20分钟）
### 3. 巩固练习（约10分钟）
### 4. 课堂小结（约5分钟）

## 五、板书设计

## 六、作业布置

## 七、教学反思
(留空供教师课后填写)`;

        let userPrompt = `请为以下教学内容设计一份完整的教案：

**基本信息**
- 科目：${subjectName}
- 年级：${gradeName}年级${volumeName}册
- 教学内容：${context.topic}`;

        if (context.classPerformance) {
            const perf = context.classPerformance;
            userPrompt += `

**班级学情分析**
- 班级均分：${perf.avgScore.toFixed(1)}分
- 及格率：${perf.passRate.toFixed(1)}%
- 优秀率：${perf.excellentRate.toFixed(1)}%`;

            if (perf.weakSubjects.length > 0) {
                userPrompt += `\n- 薄弱科目：${perf.weakSubjects.join('、')}`;
            }
            if (perf.strongSubjects.length > 0) {
                userPrompt += `\n- 优势科目：${perf.strongSubjects.join('、')}`;
            }

            userPrompt += `\n\n请根据以上学情，适当调整教学难度、练习设计和教学策略，让教案更具针对性。`;
        }

        userPrompt += `\n\n请生成一份完整、专业的教学设计，约1000-1500字。`;

        return { systemPrompt, userPrompt };
    }

    /**
     * 根据反馈优化教案（流式）
     */
    async refineLessonPlanStream(
        c: Context,
        originalContent: string,
        feedback: string,
        context: LessonPlanContext
    ): Promise<Response> {
        const subjectNames: Record<string, string> = {
            math: '数学',
            chinese: '语文',
            english: '英语'
        };

        const gradeNames = ['', '一', '二', '三', '四', '五', '六'];
        const subjectName = subjectNames[context.subject] || context.subject;
        const gradeName = gradeNames[context.grade] || context.grade;

        const systemPrompt = `你是一位经验丰富的小学${subjectName}教师。
你的任务是根据老师的反馈意见，对已有教案进行调整和优化。
请保持教案的整体结构，但根据反馈进行针对性修改。`;

        const userPrompt = `请根据以下反馈优化教案：

**原教案内容**：
${originalContent}

**老师的修改意见**：
${feedback}

**教学信息**：
- 科目：${subjectName}
- 年级：${gradeName}年级
- 主题：${context.topic}

请根据以上反馈，输出调整后的完整教案。保持原有格式结构，针对反馈意见进行改进。`;

        return this.callLLM(systemPrompt, userPrompt, true) as Promise<Response>;
    }

    /**
     * 保存教案
     */
    async saveLessonPlan(
        userId: number,
        title: string,
        content: string,
        subject: string,
        grade: number,
        volume: number,
        classId?: number
    ): Promise<number> {
        const result = await this.env.DB.prepare(`
      INSERT INTO lesson_plans (user_id, title, content, subject, grade, volume, class_id, is_draft)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(userId, title, content, subject, grade, volume, classId || null).run();

        return result.meta.last_row_id as number;
    }

    /**
     * 获取用户的教案列表
     */
    async getUserLessonPlans(userId: number): Promise<any[]> {
        const result = await this.env.DB.prepare(`
      SELECT * FROM lesson_plans 
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).bind(userId).all();

        return result.results || [];
    }

    // ===================== 作业生成相关 =====================

    /**
     * 生成作业题（流式）
     */
    async generateHomeworkStream(
        c: Context,
        subject: string,
        grade: number,
        topic: string,
        difficulty: string,
        count: number
    ): Promise<Response> {
        const subjectNames: Record<string, string> = {
            math: '数学',
            chinese: '语文',
            english: '英语'
        };

        const difficultyNames: Record<string, string> = {
            basic: '基础题',
            advanced: '提高题',
            challenge: '拓展题'
        };

        const gradeNames = ['', '一', '二', '三', '四', '五', '六'];
        const subjectName = subjectNames[subject] || subject;
        const gradeName = gradeNames[grade] || grade;
        const difficultyName = difficultyNames[difficulty] || '综合';

        const systemPrompt = `你是一位经验丰富的小学${subjectName}教师，擅长设计练习题。
请根据教学内容设计高质量的练习题，题目要：
1. 紧扣知识点，难度适中
2. 题型多样（选择、填空、判断、应用题等）
3. 每道题要有完整的答案和解析`;

        const userPrompt = `请为以下内容设计${count}道${difficultyName}：

**教学信息**
- 科目：${subjectName}
- 年级：${gradeName}年级
- 知识点：${topic}
- 难度：${difficultyName}

**输出格式**
# ${subjectName} ${difficultyName}

## 第1题
**题目**：...
**答案**：...
**解析**：...

## 第2题
...

请确保题目清晰、答案准确、解析详尽。`;

        return this.callLLM(systemPrompt, userPrompt, true) as Promise<Response>;
    }

    /**
     * 根据反馈优化作业（流式）
     */
    async refineHomeworkStream(
        c: Context,
        originalContent: string,
        feedback: string,
        subject: string,
        grade: number,
        topic: string
    ): Promise<Response> {
        const subjectNames: Record<string, string> = {
            math: '数学',
            chinese: '语文',
            english: '英语'
        };

        const gradeNames = ['', '一', '二', '三', '四', '五', '六'];
        const subjectName = subjectNames[subject] || subject;
        const gradeName = gradeNames[grade] || grade;

        const systemPrompt = `你是一位经验丰富的小学${subjectName}教师。
请根据老师的反馈意见，对已有作业题进行调整和优化。`;

        const userPrompt = `请根据以下反馈优化作业题：

**原作业题**：
${originalContent}

**老师的修改意见**：
${feedback}

**教学信息**：
- 科目：${subjectName}
- 年级：${gradeName}年级
- 知识点：${topic}

请根据反馈进行调整，输出完整的作业题（含答案和解析）。`;

        return this.callLLM(systemPrompt, userPrompt, true) as Promise<Response>;
    }

    private async callLLM(system: string, user: string, stream: boolean): Promise<Response | string> {
        // 每次调用模型时检查并增加额度
        await checkAndIncrementQuota(this.env);

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
                    { role: 'system', content: system },
                    { role: 'user', content: user }
                ],
                stream
            })
        });

        if (!response.ok) {
            throw new AppError(`AI API error: ${response.status}`, 500);
        }

        if (stream) {
            if (!response.body) throw new AppError('Empty AI response body', 500);
            return new Response(response.body, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            });
        }

        const data: any = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    /**
     * 保存作业
     */
    async saveHomework(
        userId: number,
        title: string,
        content: string,
        subject: string,
        grade: number,
        topic: string,
        difficulty: string
    ): Promise<number> {
        const result = await this.env.DB.prepare(`
      INSERT INTO homework (user_id, title, content, subject, grade, topic, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(userId, title, content, subject, grade, topic, difficulty).run();

        return result.meta.last_row_id as number;
    }

    /**
     * 获取用户的作业列表
     */
    async getUserHomework(userId: number): Promise<any[]> {
        const result = await this.env.DB.prepare(`
      SELECT * FROM homework 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

        return result.results || [];
    }

    /**
     * 删除作业
     */
    async deleteHomework(userId: number, homeworkId: number): Promise<void> {
        await this.env.DB.prepare(`
      DELETE FROM homework WHERE id = ? AND user_id = ?
    `).bind(homeworkId, userId).run();
    }
}
