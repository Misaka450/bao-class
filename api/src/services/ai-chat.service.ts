import { Env } from '../types';
import { AppError } from '../utils/AppError';
import { LLMClient } from '../utils/llmClient';

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

        const sqlResponse = await LLMClient.call(this.env, {
            system: systemPrompt,
            user: `用户问题：${query}\n请只返回 JSON。`,
            stream: false
        }) as string;

        let sqlData: { sql: string };
        try {
            const jsonMatch = sqlResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Failed to parse AI SQL response');
            sqlData = JSON.parse(jsonMatch[0]);
        } catch (e) {
            throw new Error(`无法理解该查询请求。AI返回：${sqlResponse}`);
        }

        // 安全验证：确保只执行 SELECT 语句
        const sqlUpper = sqlData.sql.trim().toUpperCase();
        const forbiddenKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'REPLACE', 'GRANT', 'REVOKE'];
        if (!sqlUpper.startsWith('SELECT')) {
            throw new AppError('只允许执行查询操作', 400);
        }
        for (const keyword of forbiddenKeywords) {
            if (sqlUpper.includes(keyword)) {
                throw new AppError(`不允许的操作: ${keyword}`, 400);
            }
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
        // 1. 获取数据 (非流式)
        let dataInfo = "";
        try {
            const { results, sql } = await this.executeSqlFromQuery(query);
            dataInfo = `查询结果：${JSON.stringify(results)}`;
        } catch (e: any) {
            dataInfo = `查询失败或无权查询。错误信息：${e.message}`;
        }

        // 2. 构造总结提示词并返回流
        const summaryPrompt = `针对用户问题："${query}"
${dataInfo}
请根据以上数据给出一个友好、简洁且专业的回答。如果数据为空，请如实告知。如果是趋势分析，请给出你的洞察。`;

        return LLMClient.call(this.env, {
            system: "你是一位资深的班主任助教。",
            user: summaryPrompt,
            stream: true
        }) as Promise<Response>;
    }

    /**
     * 知识对话模式（纯对话，不查询数据）
     * 适用于：教学知识咨询、教育理念交流、方法建议等
     */
    async knowledgeChat(message: string, history: Array<{role: string, content: string}>): Promise<Response> {
        const educationSystemPrompt = `你是一位经验丰富、专业贴心的班主任AI助教。

## 你的职责
1. 回答老师关于教学、班级管理、学生教育方面的问题
2. 提供实用的教学建议和班级管理技巧
3. 帮助老师解答教育过程中的困惑
4. 以友好、专业、易懂的方式回复

## 回复原则
- 回答要具体实用，可操作性强
- 可以适当举例说明
- 语言要亲切自然，像在与一位经验丰富的同事交流
- 如果问题涉及学生隐私或敏感信息，提醒老师注意保护学生隐私
- 对于不确定的问题，如医学诊断、心理评估等，建议咨询专业人士

## 你的专长领域
- 教学方法与策略
- 学生心理与行为引导
- 班级管理与家校沟通
- 学习习惯培养
- 特殊学生关注与帮助
- 考试评价与反馈
- 课外活动组织
- 教师自我成长

请用专业且温暖的语气回答老师的问题。`;

        const messages = [
            { role: 'system', content: educationSystemPrompt },
            ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
            { role: 'user', content: message }
        ];

        return LLMClient.call(this.env, {
            system: educationSystemPrompt,
            user: message,
            stream: true,
            history: history
        }) as Promise<Response>;
    }
}
