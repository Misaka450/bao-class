import { Env } from '../types';
import { AppError } from '../utils/AppError';
import { checkAndIncrementQuota } from '../utils/aiQuota';

export class AIChatService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    /**
     * 实现自然语言转 SQL 并执行查询
     */
    async chat(query: string, userId: number, role: string): Promise<string> {
        // 1. 检查额度
        await checkAndIncrementQuota(this.env);

        // 2. 构造 Schema 描述
        const schemaInfo = `
表结构说明：
1. classes (班级): id, name, grade
2. students (学生): id, name, student_id, gender, class_id
3. courses (科目): id, name
4. exams (考试): id, name, class_id, exam_date
5. exam_courses (考试科目关联): exam_id, course_id, full_score
6. scores (成绩): student_id, exam_id, course_id, score

查询范围限制：
- 如果你是老师，你只能查询你自己班级的数据（本系统中简化演示，允许查询所有，但 AI 应保持专业态度）。
`;

        const systemPrompt = `你是一位专业的智慧班级数据分析师。
你的任务是将用户的自然语言问题转换为 SQL 语句，并在执行后对结果进行解释。

${schemaInfo}

工作流程：
1. 识别用户意图。如果是查询数据，生成一条只读 SQL (只能是 SELECT)。
2. 约束：禁止任何 UPDATE, DELETE, DROP, INSERT 操作。
3. 请严格按照以下 JSON 格式输出第一步的思考（注意：这只是你的心路历程，最终回答要包含文字）：
{
  "sql": "生成的SQL语句",
  "explanation": "你打算如何查询"
}

当前日期：${new Date().toLocaleDateString()}
`;

        // 第一步：生成 SQL
        const sqlResponse = await this.callLLM(systemPrompt, `用户问题：${query}\n请只返回 JSON。`);
        let sqlData: { sql: string };
        try {
            // 提取 JSON
            const jsonMatch = sqlResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Failed to parse AI SQL response');
            sqlData = JSON.parse(jsonMatch[0]);
        } catch (e) {
            return `抱歉，我无法理解这个查询请求。错误：${sqlResponse}`;
        }

        // 第二步：执行 SQL
        let queryResults: any[] = [];
        try {
            const dbResult = await this.env.DB.prepare(sqlData.sql).all();
            queryResults = dbResult.results || [];
        } catch (e: any) {
            return `生成了 SQL 但执行失败：${e.message}\nSQL内容：${sqlData.sql}`;
        }

        // 第三步：总结结果
        const summaryPrompt = `针对用户问题：“${query}”
查询结果数据：${JSON.stringify(queryResults)}
请根据数据给出一个友好、简洁且专业的回答。如果数据为空，请如实告知。如果是趋势分析，请给出你的洞察。`;

        return await this.callLLM("你是一位资深的班主任助教。", summaryPrompt);
    }

    private async callLLM(system: string, user: string): Promise<string> {
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
                stream: false
            })
        });

        if (!response.ok) {
            throw new AppError(`AI API error: ${response.status}`, 500);
        }

        const data: any = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }
}
