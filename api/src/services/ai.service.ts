import { Context } from 'hono';
import { Env } from '../types';
import { AppError } from '../utils/AppError';
import { checkAndIncrementQuota } from '../utils/aiQuota';

export class AIService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    /**
     * 生成学生评语 (普通请求)
     */
    async generateStudentComment(studentId: number, forceRegenerate: boolean = false) {
        // 1. 缓存优先
        const cacheKey = `ai_comment_${studentId}`;
        if (!forceRegenerate) {
            try {
                const cachedComment = await this.env.KV.get(cacheKey);
                if (cachedComment) {
                    return {
                        success: true,
                        comment: cachedComment,
                        cached: true,
                        source: 'kv'
                    };
                }
            } catch (e) {
                console.warn('KV cache read failed:', e);
            }
        } else {
            try {
                await this.env.KV.delete(cacheKey);
            } catch (e) {
                console.warn('Failed to delete KV cache:', e);
            }
        }

        // 2. 准备 Prompt 及数据
        const data = await this.prepareStudentCommentData(studentId);
        const { systemPrompt, userPrompt, student, avgScore, trend, strongSubjects, weakSubjects } = data;

        // 3. AI 调用
        const comment = await this.callAIModelNonStreaming(systemPrompt, userPrompt);

        // 4. 结果持久化
        await this.persistComment(studentId, comment, {
            avg_score: avgScore.toFixed(1),
            trend,
            strong_subjects: strongSubjects,
            weak_subjects: weakSubjects,
            model: 'deepseek-ai/DeepSeek-V3.2'
        });

        return {
            success: true,
            comment,
            cached: false,
            metadata: {
                student_name: student.name,
                avg_score: avgScore.toFixed(1),
                trend,
                strong_subjects: strongSubjects,
                weak_subjects: weakSubjects
            }
        };
    }

    /**
     * 生成学生评语 (流式请求)
     */
    async generateStudentCommentStream(c: Context, studentId: number) {
        const data = await this.prepareStudentCommentData(studentId);
        const { systemPrompt, userPrompt } = data;
        const stream = await AIService.callStreaming(c, systemPrompt, userPrompt);
        return { stream, data };
    }

    /**
     * 准备评语生成所需的数据和 Prompt
     */
    private async prepareStudentCommentData(studentId: number) {
        const [student, scoreResult, subjectScores, allScoresResult, examHistory] = await Promise.all([
            this.env.DB.prepare(`
                SELECT s.id, s.name, c.name as class_name
                FROM students s
                JOIN classes c ON s.class_id = c.id
                WHERE s.id = ?
            `).bind(studentId).first() as Promise<any>,

            this.env.DB.prepare(`
                SELECT AVG(s.score) as avg_score, COUNT(s.score) as total_exams
                FROM scores s
                WHERE s.student_id = ?
            `).bind(studentId).first() as Promise<any>,

            this.env.DB.prepare(`
                SELECT c.name as course_name, AVG(s.score) as avg_score
                FROM scores s
                JOIN courses c ON s.course_id = c.id
                WHERE s.student_id = ?
                GROUP BY c.id, c.name
                ORDER BY avg_score DESC
            `).bind(studentId).all() as Promise<any>,

            this.env.DB.prepare(`
                SELECT s.score, e.exam_date
                FROM scores s
                JOIN exams e ON s.exam_id = e.id
                WHERE s.student_id = ?
                ORDER BY e.exam_date ASC
            `).bind(studentId).all() as Promise<any>,

            this.env.DB.prepare(`
                SELECT e.name as exam_name, e.exam_date, c.name as subject_name, s.score, ec.full_score
                FROM scores s
                JOIN exams e ON s.exam_id = e.id
                JOIN courses c ON s.course_id = c.id
                JOIN exam_courses ec ON s.exam_id = ec.exam_id AND s.course_id = ec.course_id
                WHERE s.student_id = ?
                ORDER BY e.exam_date ASC, c.name ASC
            `).bind(studentId).all() as Promise<any>
        ]);

        if (!student) throw new AppError('学生不存在', 404);

        const avgScore = scoreResult?.avg_score || 0;
        const { strongSubjects, weakSubjects } = this.processSubjectPerformance(subjectScores.results || []);
        const { trend, trendDescription } = this.analyzeScoreTrend(allScoresResult.results || []);
        const examHistoryText = this.formatExamHistory(examHistory.results || []);

        const systemPrompt = '你是一位经验丰富的班主任，擅长通过成绩数据了解学生的学习状态，并给出温情、客观且具有建设性的评语。';
        const userPrompt = `学生姓名：${student.name}\n班级：${student.class_name}\n平均分：${avgScore.toFixed(1)}\n成绩趋势：${trendDescription}\n优势科目：${strongSubjects}\n薄弱科目：${weakSubjects}\n考试记录索引：\n${examHistoryText}\n\n请写一段 150-200 字的详细期末/阶段评语。要求：第一部分肯定进步与优势，第二部分指出不足并给出具体的建议，语言亲切自然。`;

        return { systemPrompt, userPrompt, student, avgScore, trend, strongSubjects, weakSubjects };
    }

    private processSubjectPerformance(results: any[]) {
        if (results.length === 0) return { strongSubjects: '暂无', weakSubjects: '暂无' };
        const sorted = [...results].sort((a, b) => b.avg_score - a.avg_score);
        return {
            strongSubjects: sorted.slice(0, 2).map(r => r.course_name).join('、'),
            weakSubjects: sorted.slice(-2).map(r => r.course_name).join('、')
        };
    }

    private analyzeScoreTrend(scores: any[]) {
        if (scores.length < 3) return { trend: '稳定', trendDescription: '成绩保持稳定' };

        const n = scores.length;
        let sum_x = 0, sum_y = 0, sum_xy = 0, sum_xx = 0;
        scores.forEach((s, i) => {
            const x = i + 1;
            sum_x += x; sum_y += s.score; sum_xy += x * s.score; sum_xx += x * x;
        });

        const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
        const diff = scores[n - 1].score - scores[0].score;

        if (slope > 2 || diff > 10) return { trend: '显著进步', trendDescription: `整体上升，近期提升${diff.toFixed(1)}分` };
        if (slope > 0.5 || diff > 5) return { trend: '进步', trendDescription: `稳步提升，近期提升${diff.toFixed(1)}分` };
        if (slope < -2 || diff < -10) return { trend: '显著退步', trendDescription: `整体下降，近期下滑${Math.abs(diff).toFixed(1)}分` };
        if (slope < -0.5 || diff < -5) return { trend: '退步', trendDescription: `有所下滑，近期下滑${Math.abs(diff).toFixed(1)}分` };
        return { trend: '稳定', trendDescription: `保持稳定，波动在${Math.abs(diff).toFixed(1)}分内` };
    }

    private formatExamHistory(results: any[]) {
        if (results.length === 0) return '\n暂无考试记录';
        const exams: Record<string, string[]> = {};
        results.forEach(r => {
            if (!exams[r.exam_name]) exams[r.exam_name] = [];
            exams[r.exam_name].push(`${r.subject_name} ${r.score}/${r.full_score}分`);
        });
        return Object.entries(exams).map(([name, subs]) => `\n${name}: ${subs.join('; ')}`).join('');
    }

    private async callAIModelNonStreaming(systemPrompt: string, userPrompt: string) {
        // 检查并增加 AI 额度
        await checkAndIncrementQuota(this.env);

        const apiKey = this.env.DASHSCOPE_API_KEY;
        if (!apiKey) throw new AppError('未配置 DASHSCOPE_API_KEY', 500);

        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'deepseek-ai/DeepSeek-V3.2',
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'unknown error' })) as any;
            throw new AppError(error.message || 'AI 生成失败', response.status);
        }

        const data = await response.json() as any;
        return data.choices?.[0]?.message?.content || '';
    }

    /**
     * 流式调用 AI (模型响应转发)
     */
    static async callStreaming(c: Context, systemPrompt: string, userPrompt: string) {
        // 检查并增加 AI 额度
        await checkAndIncrementQuota(c.env);

        const apiKey = c.env.DASHSCOPE_API_KEY;
        if (!apiKey) throw new AppError('未配置 DASHSCOPE_API_KEY', 500);

        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
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

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'unknown error' })) as any;
            throw new AppError(error.message || 'AI 流式生成失败', response.status);
        }

        return response.body;
    }

    /**
     * 持久化评语到本地数据库和 KV
     */
    public async persistComment(studentId: number, comment: string, metadata: any) {
        // 保存到数据库
        await this.env.DB.prepare(`
            INSERT INTO ai_comments (student_id, comment, metadata)
            VALUES (?, ?, ?)
        `).bind(studentId, comment, JSON.stringify(metadata)).run();

        // 写入 KV 缓存
        await this.env.KV.put(`ai_comment_${studentId}`, comment, { expirationTtl: 86400 });
    }
}
