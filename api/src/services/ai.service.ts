import { Env } from '../types';
import { AppError } from '../utils/AppError';

export class AIService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    /**
     * 生成学生评语
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

        // 2. 并行获取数据
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

        // 3. 数据分析逻辑
        const avgScore = scoreResult?.avg_score || 0;
        const { strongSubjects, weakSubjects } = this.processSubjectPerformance(subjectScores.results || []);
        const { trend, trendDescription } = this.analyzeScoreTrend(allScoresResult.results || []);
        const examHistoryText = this.formatExamHistory(examHistory.results || []);

        // 4. AI 调度
        const comment = await this.callAIModel(student.name, student.class_name, avgScore, trend, trendDescription, strongSubjects, weakSubjects, examHistoryText, forceRegenerate);

        // 5. 结果持久化
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

    private async callAIModel(name: string, className: string, avgScore: number, trend: string, trendDesc: string, strong: string, weak: string, history: string, force: boolean) {
        const apiKey = this.env.DASHSCOPE_API_KEY;
        if (!apiKey) throw new Error('DASHSCOPE_API_KEY is missing');

        const systemPrompt = `你是一位经验丰富、富有爱心的小学班主任，正在为学生撰写期末评语。要求：字数120-150，语气温和，一段话写完。`;
        const userPrompt = `学生：${name}，班级：${className}，均分：${avgScore.toFixed(1)}，趋势：${trend}(${trendDesc})，强势：${strong}，薄弱：${weak}。历次记录：${history}。`;

        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'deepseek-ai/DeepSeek-V3.2',
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
                enable_thinking: true
            })
        });

        if (!response.ok) throw new Error(`AI API Error: ${response.status}`);
        const data: any = await response.json();
        let content = data.choices?.[0]?.message?.content || '生成失败';
        return content.trim().replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '');
    }

    private async persistComment(studentId: number, comment: string, metadata: any) {
        try {
            await this.env.KV.put(`ai_comment_${studentId}`, comment, { expirationTtl: 3600 });
            await this.env.DB.prepare(`
                INSERT INTO ai_comments (student_id, comment, metadata) VALUES (?, ?, ?)
            `).bind(studentId, comment, JSON.stringify(metadata)).run();
        } catch (e) {
            console.warn('Persistence failed:', e);
        }
    }
}
