import { Context } from 'hono';
import { Env } from '../types';
import { AppError } from '../utils/AppError';
import { AIService } from './ai.service';

export class AnalysisService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    /**
     * 获取班级重点关注名单
     */
    async getClassFocusGroup(classId: number) {
        // 获取最新考试
        const latestExam = await this.env.DB.prepare(`
            SELECT e.id FROM exams e
            JOIN scores s ON e.id = s.exam_id
            JOIN students st ON s.student_id = st.id
            WHERE st.class_id = ?
            ORDER BY e.exam_date DESC LIMIT 1
        `).bind(classId).first<any>();

        const examId = latestExam?.id || 0;

        // 并行获取各类群体
        const [critical, examsCount, imbalanced] = await Promise.all([
            // 临界生 (55-62 或 85-92)
            this.env.DB.prepare(`
                SELECT DISTINCT st.id, st.name, 'critical' as type, s.score, c.name as subject
                FROM students st
                JOIN scores s ON st.id = s.student_id
                JOIN courses c ON s.course_id = c.id
                WHERE st.class_id = ? AND s.exam_id = ?
                AND ((s.score BETWEEN 55 AND 62) OR (s.score BETWEEN 85 AND 92))
            `).bind(classId, examId).all(),

            // 检查是否有足够的考试进行趋势分析
            this.env.DB.prepare(`
                SELECT COUNT(DISTINCT e.id) as count FROM exams e 
                JOIN scores s ON e.id = s.exam_id 
                JOIN students st ON s.student_id = st.id 
                WHERE st.class_id = ?
            `).bind(classId).first<any>(),

            // 偏科生 (总分在均分以上但有不及格科目)
            this.env.DB.prepare(`
                SELECT DISTINCT st.id, st.name, 'imbalanced' as type, s.score as failed_score, c.name as subject
                FROM students st
                JOIN scores s ON st.id = s.student_id
                JOIN courses c ON s.course_id = c.id
                WHERE st.class_id = ? AND s.exam_id = ? AND s.score < 60
                AND st.id IN (
                    SELECT student_id FROM scores WHERE exam_id = ?
                    GROUP BY student_id 
                    HAVING SUM(score) > (SELECT AVG(total) FROM (SELECT SUM(score) as total FROM scores WHERE exam_id = ? GROUP BY student_id))
                )
            `).bind(classId, examId, examId, examId).all()
        ]);

        let regressing: any[] = [];
        let fluctuating: any[] = [];

        if (examsCount && examsCount.count >= 2) {
            const [regResult, flucResult] = await Promise.all([
                // 退步生
                this.env.DB.prepare(`
                    WITH StudentExamAverages AS (
                        SELECT s.student_id, st.name, s.exam_id, e.exam_date, AVG(s.score) as avg_score
                        FROM scores s JOIN exams e ON s.exam_id = e.id JOIN students st ON s.student_id = st.id
                        WHERE st.class_id = ? GROUP BY s.student_id, s.exam_id
                    ),
                    StudentStats AS (
                        SELECT student_id, name, AVG(avg_score) as overall_avg,
                            (SELECT avg_score FROM StudentExamAverages sea2 WHERE sea2.student_id = sea1.student_id ORDER BY exam_date DESC LIMIT 1) as latest_score
                        FROM StudentExamAverages sea1 GROUP BY student_id
                    )
                    SELECT student_id as id, name, 'regressing' as type, (overall_avg - latest_score) as drop_amount
                    FROM StudentStats WHERE drop_amount > 5
                `).bind(classId).all(),

                // 波动生
                this.env.DB.prepare(`
                    SELECT st.id, st.name, 'fluctuating' as type, c.name as subject, (MAX(s.score) - MIN(s.score)) as score_diff
                    FROM scores s JOIN students st ON s.student_id = st.id JOIN courses c ON s.course_id = c.id
                    WHERE st.class_id = ? GROUP BY s.student_id, s.course_id HAVING score_diff > 10
                `).bind(classId).all()
            ]);
            regressing = regResult.results || [];
            fluctuating = flucResult.results || [];
        }

        return {
            critical: critical.results || [],
            regressing,
            fluctuating,
            imbalanced: imbalanced.results || []
        };
    }

    /**
     * 获取考试质量分析
     */
    async getExamQuality(examId: number) {
        const courses = await this.env.DB.prepare(`
            SELECT ec.course_id, c.name, ec.full_score
            FROM exam_courses ec
            JOIN courses c ON ec.course_id = c.id
            WHERE ec.exam_id = ?
        `).bind(examId).all();

        const results = [];
        for (const course of (courses.results || [])) {
            const scoresResult = await this.env.DB.prepare(`
                SELECT score FROM scores WHERE exam_id = ? AND course_id = ? ORDER BY score DESC
            `).bind(examId, course.course_id).all();

            const scores = (scoresResult.results || []).map((s: any) => s.score);
            if (scores.length === 0) continue;

            const count = scores.length;
            const avg = scores.reduce((a, b) => a + b, 0) / count;
            const stdDev = Math.sqrt(scores.map(s => Math.pow(s - avg, 2)).reduce((a, b) => a + b, 0) / count);
            const fullScore = Number(course.full_score) || 100;
            const groupSize = Math.floor(count * 0.27);
            let discrimination = 0;

            if (groupSize > 0) {
                const highGroup = scores.slice(0, groupSize);
                const lowGroup = scores.slice(-groupSize);
                discrimination = (highGroup.reduce((a, b) => a + b, 0) / groupSize - lowGroup.reduce((a, b) => a + b, 0) / groupSize) / fullScore;
            }

            results.push({
                course_id: course.course_id,
                course_name: course.name,
                full_score: fullScore,
                stats: {
                    count,
                    avg: Number(avg.toFixed(1)),
                    max: Math.max(...scores),
                    min: Math.min(...scores),
                    std_dev: Number(stdDev.toFixed(1)),
                    difficulty: Number((avg / fullScore).toFixed(2)),
                    discrimination: Number(discrimination.toFixed(2))
                }
            });
        }
        return results;
    }

    /**
     * 获取或生成班级诊断报告
     */
    async getClassReport(classId: number, examId: number, force: boolean = false) {
        if (!force) {
            const cached = await this.env.DB.prepare(`
                SELECT report_content FROM ai_class_reports WHERE class_id = ? AND exam_id = ?
            `).bind(classId, examId).first<any>();
            if (cached) return { report: cached.report_content, cached: true };
        } else {
            await this.env.DB.prepare(`DELETE FROM ai_class_reports WHERE class_id = ? AND exam_id = ?`).bind(classId, examId).run();
        }

        const prompt = await this.prepareReportPrompt(classId, examId);

        const apiKey = this.env.DASHSCOPE_API_KEY;
        if (!apiKey) throw new Error('DASHSCOPE_API_KEY is missing');

        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'deepseek-ai/DeepSeek-V3.2',
                messages: [{ role: 'system', content: '资深教育分析专家' }, { role: 'user', content: prompt }],
                enable_thinking: true
            })
        });

        if (!response.ok) throw new Error(`AI API Error: ${response.status}`);
        const data: any = await response.json();
        const report = data.choices?.[0]?.message?.content?.trim() || '生成报告失败';

        if (!report.includes('失败')) {
            await this.persistReport(classId, examId, report);
        }

        return { report, cached: false };
    }

    /**
     * 持久化班级报告
     */
    public async persistReport(classId: number, examId: number, report: string) {
        await this.env.DB.prepare(`
            INSERT INTO ai_class_reports (class_id, exam_id, report_content) VALUES (?, ?, ?)
            ON CONFLICT(class_id, exam_id) DO UPDATE SET report_content = excluded.report_content, updated_at = CURRENT_TIMESTAMP
        `).bind(classId, examId, report).run();
    }

    /**
     * 生成班级学情诊断报告 (流式)
     */
    async generateClassReportStream(c: Context, classId: number, examId: number) {
        const prompt = await this.prepareReportPrompt(classId, examId);
        const systemPrompt = '你是一位专业的教育数据分析专家，善于从海量考试数据中洞察教学问题，并给出高度专业、落地、且具有前瞻性的教学建议。请分析以下考试数据并生成报告。';

        return AIService.callStreaming(c, systemPrompt, prompt);
    }

    private async prepareReportPrompt(classId: number, examId: number): Promise<string> {
        const [classInfo, examInfo, stats] = await Promise.all([
            this.env.DB.prepare('SELECT name FROM classes WHERE id = ?').bind(classId).first<any>(),
            this.env.DB.prepare('SELECT name FROM exams WHERE id = ?').bind(examId).first<any>(),
            this.env.DB.prepare(`
                SELECT c.name as course_name, AVG(s.score) as avg_score, MAX(s.score) as max_score, MIN(s.score) as min_score,
                       COUNT(CASE WHEN s.score >= 60 THEN 1 END) * 100.0 / COUNT(*) as pass_rate
                FROM scores s JOIN courses c ON s.course_id = c.id JOIN students st ON s.student_id = st.id
                WHERE st.class_id = ? AND s.exam_id = ? GROUP BY s.course_id
            `).bind(classId, examId).all()
        ]);

        if (!stats.results?.length) throw new AppError('暂无考试数据', 404);

        const dataStr = stats.results.map((r: any) =>
            `- ${r.course_name}: 均分${Number(r.avg_score).toFixed(1)}, 最高${r.max_score}, 最低${r.min_score}, 及格率${Number(r.pass_rate).toFixed(1)}%`
        ).join('\n');

        return `你是一位教育专家。请分析 ${classInfo?.name} 在 ${examInfo?.name} 中的表现：\n${dataStr}\n要求：包含【整体分析】【优势】【薄弱】【建议】，400-500字。`;
    }

    /**
     * 获取成绩分布
     */
    async getScoreDistribution(classId: number, examId: number) {
        const [subjectsResult, scoresResult] = await Promise.all([
            this.env.DB.prepare(`
                SELECT DISTINCT c.id, c.name FROM courses c JOIN exam_courses ec ON c.id = ec.course_id WHERE ec.exam_id = ? ORDER BY c.name
            `).bind(examId).all(),
            this.env.DB.prepare(`
                SELECT sc.course_id, sc.score FROM scores sc JOIN students s ON sc.student_id = s.id WHERE sc.exam_id = ? AND s.class_id = ?
            `).bind(examId, classId).all()
        ]);

        const subjects = subjectsResult.results as any[];
        const scores = scoresResult.results as any[];

        return subjects.map(subject => {
            const subjectScores = scores.filter(s => s.course_id === subject.id).map(s => s.score);
            let fail = 0, pass = 0, good = 0, excellent = 0;
            subjectScores.forEach(s => {
                if (s < 60) fail++; else if (s < 75) pass++; else if (s < 85) good++; else excellent++;
            });
            return { subject: subject.name, fail, pass, good, excellent };
        });
    }
}
