import { Context } from 'hono';
import { Env } from '../types';
import { AppError } from '../utils/AppError';
import { AIService } from './ai.service';
import { getModelForFeature } from '../utils/modelConfig';

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
            // 临界生 (55-62，及格边缘)
            this.env.DB.prepare(`
                SELECT DISTINCT st.id, st.name, 'critical' as type, s.score, c.name as subject
                FROM students st
                JOIN scores s ON st.id = s.student_id
                JOIN courses c ON s.course_id = c.id
                WHERE st.class_id = ? AND s.exam_id = ?
                AND s.score BETWEEN 55 AND 62
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
                    HAVING SUM(score) > (
                        SELECT AVG(total) FROM (
                            SELECT SUM(score) as total 
                            FROM scores s2
                            JOIN students st2 ON s2.student_id = st2.id
                            WHERE s2.exam_id = ? AND st2.class_id = ?
                            GROUP BY s2.student_id
                        )
                    )
                )
            `).bind(classId, examId, examId, examId, classId).all()
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

        // 批量获取该考试的所有成绩，然后在内存中进行统计，避免循环查询数据库
        const allScoresResult = await this.env.DB.prepare(`
            SELECT course_id, score FROM scores WHERE exam_id = ?
        `).bind(examId).all();
        const allScores = (allScoresResult.results || []) as any[];

        for (const course of (courses.results || [])) {
            const courseScores = allScores
                .filter(s => s.course_id === course.course_id)
                .map(s => s.score)
                .sort((a, b) => b - a);

            if (courseScores.length === 0) continue;

            const count = courseScores.length;
            const avg = courseScores.reduce((a, b) => a + b, 0) / count;
            const stdDev = Math.sqrt(courseScores.map(s => Math.pow(s - avg, 2)).reduce((a, b) => a + b, 0) / count);
            const fullScore = Number(course.full_score) || 100;
            const groupSize = Math.floor(count * 0.27);
            let discrimination = 0;

            if (groupSize > 0) {
                const highGroup = courseScores.slice(0, groupSize);
                const lowGroup = courseScores.slice(-groupSize);
                discrimination = (highGroup.reduce((a, b) => a + b, 0) / groupSize - lowGroup.reduce((a, b) => a + b, 0) / groupSize) / fullScore;
            }

            results.push({
                course_id: course.course_id,
                course_name: course.name,
                full_score: fullScore,
                stats: {
                    count,
                    avg: Number(avg.toFixed(1)),
                    max: Math.max(...courseScores),
                    min: Math.min(...courseScores),
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

        const { systemPrompt, userPrompt } = await this.prepareEnhancedReportPrompt(classId, examId);
        const model = await getModelForFeature(this.env, 'report');

        const apiKey = this.env.DASHSCOPE_API_KEY;
        if (!apiKey) throw new Error('DASHSCOPE_API_KEY is missing');

        const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
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
     * @param focusGroupData 可选，前端传入的预警学生数据（避免重复查询）
     */
    async generateClassReportStream(c: Context, classId: number, examId: number, reporterName: string = '系统', focusGroupData?: any) {
        const { systemPrompt, userPrompt } = await this.prepareEnhancedReportPrompt(classId, examId, reporterName, focusGroupData);
        const model = await getModelForFeature(c.env, 'report');
        return AIService.callStreaming(c, systemPrompt, userPrompt, model);
    }

    /**
     * 增强版报告数据准备 - 多维度数据采集
     * @param focusGroupData 可选，前端传入的预警学生数据（避免重复查询）
     */
    private async prepareEnhancedReportPrompt(classId: number, examId: number, reporterName: string = '系统', focusGroupData?: any): Promise<{ systemPrompt: string; userPrompt: string }> {
        // 获取北京时间 (UTC+8)
        const now = new Date();
        const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const reportDate = beijingTime.toISOString().split('T')[0]; // YYYY-MM-DD
        const reportTime = beijingTime.toISOString().split('T')[1].substring(0, 5); // HH:MM
        // 1. 基础信息和当前考试数据
        const [classInfo, examInfo, stats, studentCount] = await Promise.all([
            this.env.DB.prepare('SELECT name, grade FROM classes WHERE id = ?').bind(classId).first<any>(),
            this.env.DB.prepare('SELECT name, exam_date FROM exams WHERE id = ?').bind(examId).first<any>(),
            this.env.DB.prepare(`
                SELECT c.name as course_name, AVG(s.score) as avg_score, MAX(s.score) as max_score, MIN(s.score) as min_score,
                       COUNT(CASE WHEN s.score >= 60 THEN 1 END) * 100.0 / COUNT(*) as pass_rate,
                       COUNT(CASE WHEN s.score >= 85 THEN 1 END) * 100.0 / COUNT(*) as excellent_rate
                FROM scores s JOIN courses c ON s.course_id = c.id JOIN students st ON s.student_id = st.id
                WHERE st.class_id = ? AND s.exam_id = ? GROUP BY s.course_id
            `).bind(classId, examId).all(),
            this.env.DB.prepare('SELECT COUNT(*) as count FROM students WHERE class_id = ?').bind(classId).first<any>()
        ]);

        if (!stats.results?.length) throw new AppError('暂无考试数据', 404);

        // 2. 数据可用性标记
        const dataAvailability = {
            hasHistory: false,
            hasGradeComparison: false,
            hasFocusStudents: false,
            hasMultipleSubjects: stats.results.length > 1
        };

        // 3. 历史对比数据（上次考试）
        let historySection = '首次考试，暂无历史对比数据。';
        const previousExam = await this.env.DB.prepare(`
            SELECT e.id, e.name FROM exams e
            JOIN scores s ON e.id = s.exam_id
            JOIN students st ON s.student_id = st.id
            WHERE st.class_id = ? AND e.id < ? 
            ORDER BY e.exam_date DESC LIMIT 1
        `).bind(classId, examId).first<any>();

        if (previousExam) {
            dataAvailability.hasHistory = true;
            const prevStats = await this.env.DB.prepare(`
                SELECT c.name as course_name, AVG(s.score) as avg_score
                FROM scores s JOIN courses c ON s.course_id = c.id JOIN students st ON s.student_id = st.id
                WHERE st.class_id = ? AND s.exam_id = ? GROUP BY s.course_id
            `).bind(classId, previousExam.id).all();

            const prevMap = new Map((prevStats.results || []).map((r: any) => [r.course_name, r.avg_score]));
            const comparisons = stats.results.map((r: any) => {
                const prevScore = prevMap.get(r.course_name);
                if (prevScore !== undefined) {
                    const diff = Number(r.avg_score) - Number(prevScore);
                    return `- ${r.course_name}: ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}分`;
                }
                return `- ${r.course_name}: 无对比数据`;
            });
            historySection = `与上次考试(${previousExam.name})对比：\n${comparisons.join('\n')}`;
        }

        // 4. 年级横向对比
        let gradeSection = '班级为独立班级，暂无年级对比数据。';
        if (classInfo?.grade) {
            const gradeClasses = await this.env.DB.prepare(`
                SELECT cl.id, cl.name, AVG(s.score) as avg_score
                FROM classes cl
                JOIN students st ON st.class_id = cl.id
                JOIN scores s ON s.student_id = st.id
                WHERE cl.grade = ? AND s.exam_id = ?
                GROUP BY cl.id
                ORDER BY avg_score DESC
            `).bind(classInfo.grade, examId).all();

            if (gradeClasses.results && gradeClasses.results.length > 1) {
                dataAvailability.hasGradeComparison = true;
                const rank = gradeClasses.results.findIndex((c: any) => c.id === classId) + 1;
                const gradeAvg = gradeClasses.results.reduce((sum: number, c: any) => sum + Number(c.avg_score), 0) / gradeClasses.results.length;
                const classAvg = gradeClasses.results.find((c: any) => c.id === classId)?.avg_score || 0;
                gradeSection = `年级共 ${gradeClasses.results.length} 个班级\n- 本班排名：第 ${rank} 名\n- 本班均分：${Number(classAvg).toFixed(1)}\n- 年级均分：${gradeAvg.toFixed(1)}\n- 与年级均分差：${(Number(classAvg) - gradeAvg) >= 0 ? '+' : ''}${(Number(classAvg) - gradeAvg).toFixed(1)}`;
            }
        }

        // 5. 重点关注群体（优先使用前端传入的缓存数据）
        let focusSection = '暂无需特别关注的学生。';
        try {
            const focusGroups = focusGroupData || await this.getClassFocusGroup(classId);
            const criticalCount = focusGroups.critical?.length || 0;
            const regressingCount = focusGroups.regressing?.length || 0;
            const imbalancedCount = focusGroups.imbalanced?.length || 0;
            const fluctuatingCount = focusGroups.fluctuating?.length || 0;

            if (criticalCount + regressingCount + imbalancedCount + fluctuatingCount > 0) {
                dataAvailability.hasFocusStudents = true;
                const focusParts = [];
                if (criticalCount > 0) {
                    const names = focusGroups.critical.slice(0, 5).map((s: any) => s.name).join('、');
                    focusParts.push(`- 临界生(${criticalCount}人): ${names}${criticalCount > 5 ? '等' : ''}`);
                }
                if (regressingCount > 0) {
                    const names = focusGroups.regressing.slice(0, 5).map((s: any) => s.name).join('、');
                    focusParts.push(`- 退步生(${regressingCount}人): ${names}${regressingCount > 5 ? '等' : ''}`);
                }
                if (imbalancedCount > 0) {
                    const names = focusGroups.imbalanced.slice(0, 5).map((s: any) => s.name).join('、');
                    focusParts.push(`- 偏科生(${imbalancedCount}人): ${names}${imbalancedCount > 5 ? '等' : ''}`);
                }
                if (fluctuatingCount > 0) {
                    const names = focusGroups.fluctuating.slice(0, 5).map((s: any) => s.name).join('、');
                    focusParts.push(`- 波动生(${fluctuatingCount}人): ${names}${fluctuatingCount > 5 ? '等' : ''}`);
                }
                focusSection = focusParts.join('\n');
            }
        } catch (e) {
            // 获取失败时保持默认值
        }

        // 6. 成绩分布
        let distributionSection = '';
        try {
            const distribution = await this.getScoreDistribution(classId, examId);
            distributionSection = distribution.map((d: any) =>
                `- ${d.subject}: 不及格${d.fail}人, 及格${d.pass}人, 良好${d.good}人, 优秀${d.excellent}人`
            ).join('\n');
        } catch (e) {
            distributionSection = '成绩分布数据获取失败';
        }

        // 7. 当前成绩明细
        const currentStatsStr = stats.results.map((r: any) =>
            `- ${r.course_name}: 均分${Number(r.avg_score).toFixed(1)}, 最高${r.max_score}, 最低${r.min_score}, 及格率${Number(r.pass_rate).toFixed(1)}%, 优秀率${Number(r.excellent_rate).toFixed(1)}%`
        ).join('\n');

        // 8. 构建增强版 System Prompt
        const systemPrompt = `你是一位资深教育数据分析专家，拥有20年一线教学和教研经验。你擅长：
1. 从数据中发现深层问题和规律
2. 给出具体可操作的教学建议，不空谈理论
3. 语言专业但不晦涩，适合教师和家长阅读
4. 关注每一个学生，特别是需要帮助的学生

请使用 Markdown 格式输出报告，使用清晰的标题层级结构。`;

        // 9. 构建增强版 User Prompt
        const userPrompt = `## 班级信息
- 班级：${classInfo?.name || '未知'}
- 考试：${examInfo?.name || '未知'}
- 考试日期：${examInfo?.exam_date || '未知'}
- 学生人数：${studentCount?.count || '未知'}

## 报告信息
- 生成时间：${reportDate} ${reportTime}（北京时间）
- 报告人：${reporterName}

## 本次考试成绩
${currentStatsStr}

## 成绩分布
${distributionSection}

## 历史对比
${historySection}

## 年级横向对比
${gradeSection}

## 重点关注群体
${focusSection}

---

请根据以上数据，生成一份 **800-1000字** 的班级学情诊断报告，包含以下章节：

## 一、整体表现与年级定位
分析班级整体成绩表现，${dataAvailability.hasGradeComparison ? '在年级中的位置定位' : '总体评价'}。

## 二、趋势分析
${dataAvailability.hasHistory ? '与上次考试对比，分析进步和退步的科目及原因。' : '请基于本次成绩分析各科表现差异。'}

## 三、分层诊断
1. 优秀生群体特点与进一步培养建议
2. 中等生群体特点与提升策略
3. 学困生群体特点与帮扶措施

## 四、重点关注名单
${dataAvailability.hasFocusStudents ? '列出需要重点关注的学生，并给出具体干预建议。' : '分析哪些学生需要重点关注。'}

## 五、学科诊断
各科目优势与薄弱环节分析，指出可能的知识点问题。

## 六、教学建议
具体的教学策略调整建议，包括整体建议和分科建议。

## 七、家校沟通要点
给班主任的家长会或家访沟通要点建议（3-5条）。`;

        return { systemPrompt, userPrompt };
    }

    /**
     * 原有的简化版（保持兼容）
     */
    private async prepareReportPrompt(classId: number, examId: number): Promise<string> {
        const { userPrompt } = await this.prepareEnhancedReportPrompt(classId, examId);
        return userPrompt;
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
