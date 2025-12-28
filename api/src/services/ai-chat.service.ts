import { Env } from '../types';
import { AppError } from '../utils/AppError';
import { checkAndIncrementQuota } from '../utils/aiQuota';

export class AIChatService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    /**
     * 实现自然语言转 SQL 并执行查询 (非流式接口，内部使用)
     */
    async executeSqlFromQuery(query: string): Promise<{ results: any[], sql: string }> {
        // 构造 Schema 描述
        const schemaInfo = `
表结构说明：
1. classes (班级): id, name, grade
2. students (学生): id, name, student_id, gender, class_id
3. courses (科目): id, name
4. exams (考试): id, name, class_id, exam_date
5. exam_courses (考试科目关联): exam_id, course_id, full_score
6. scores (成绩): student_id, exam_id, course_id, score

查询范围限制：
- 请生成一条只读 SQL (只能是 SELECT)。
- 禁止任何 UPDATE, DELETE, DROP, INSERT 操作。
`;

        const systemPrompt = `你是一位专业的智慧班级数据分析师。
你的任务是将用户的自然语言问题转换为 SQL 语句。

${schemaInfo}

请严格按以下 JSON 格式输出：
{
  "sql": "生成的SQL语句",
  "explanation": "你的查询逻辑简述"
}
`;

        const sqlResponse = await this.callLLM(systemPrompt, `用户问题：${query}\n请只返回 JSON。`, false);
        let sqlData: { sql: string };
        try {
            const jsonMatch = (sqlResponse as string).match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Failed to parse AI SQL response');
            sqlData = JSON.parse(jsonMatch[0]);
        } catch (e) {
            throw new Error(`无法理解该查询请求。AI返回：${sqlResponse}`);
        }

        const dbResult = await this.env.DB.prepare(sqlData.sql).all();
        return {
            results: dbResult.results || [],
            sql: sqlData.sql
        };
    }

    /**
     * AI 对话流式接口
     */
    async chatStream(query: string): Promise<Response> {
        // 1. 检查额度
        await checkAndIncrementQuota(this.env);

        // 2. 获取数据 (非流式)
        let dataInfo = "";
        try {
            const { results, sql } = await this.executeSqlFromQuery(query);
            dataInfo = `查询结果：${JSON.stringify(results)}`;
        } catch (e: any) {
            dataInfo = `查询失败或无权查询。错误信息：${e.message}`;
        }

        // 3. 构造总结提示词并返回流
        const summaryPrompt = `针对用户问题：“${query}”
${dataInfo}
请根据以上数据给出一个友好、简洁且专业的回答。如果数据为空，请如实告知。如果是趋势分析，请给出你的洞察。`;

        return this.callLLM("你是一位资深的班主任助教。", summaryPrompt, true) as Promise<Response>;
    }

    private async callLLM(system: string, user: string, stream: boolean): Promise<string | Response> {
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
}
