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
}
