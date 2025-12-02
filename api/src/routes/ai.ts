import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { AppError } from '../utils/AppError'

type Bindings = {
    DB: D1Database
    AI: Ai
    KV: KVNamespace
}

const ai = new Hono<{ Bindings: Bindings }>()

// Apply auth middleware
ai.use('*', authMiddleware)

// Helper: 生成缓存 key
function getCacheKey(studentId: number, latestExamId: number | null): string {
    return `ai_comment:${studentId}:${latestExamId || 'all'}`
}

// Helper: 优化的 Prompt 生成
function generateOptimizedPrompt(data: {
    studentName: string
    className: string
    avgScore: number
    trend: string
    trendDescription: string
    strongSubjects: string
    weakSubjects: string
    examHistoryText: string
}): string {
    return `# 任务角色
你是一位有 20 年教学经验的资深班主任，善于观察学生成长，用温暖而专业的语言给予学生鼓励和建议。

## 任务说明
请为学生撰写一段 **120-150 字**的期末评语。

## 评语要求
1. **语气**：温和、鼓励、真诚，体现对学生的关心
2. **内容**：客观具体，结合数据，避免空洞表扬
3. **结构**：成绩表现 → 优势肯定 → 改进建议
4. **格式**：直接输出评语正文，以"${data.studentName}同学"开头

## 学生数据

**基本信息**
- 姓名：${data.studentName}
- 班级：${data.className}

**学业表现**
- 最近平均分：${data.avgScore.toFixed(1)} 分
- 成绩趋势：${data.trend}（${data.trendDescription}）
- 优势科目：${data.strongSubjects}
- 薄弱科目：${data.weakSubjects}

**考试历史**${data.examHistoryText}

## 输出要求
直接输出评语，不要包含任何解释、思考过程或其他内容。评语必须以"${data.studentName}同学"开头。`
}

// Generate student comment
ai.post('/generate-comment', async (c) => {
    const { student_id } = await c.req.json()

    try {
        console.log('[AI] Starting comment generation for student_id:', student_id);

        // 优化查询：一次性获取所有需要的数据
        const studentData = await c.env.DB.prepare(`
            SELECT 
                s.id,
                s.name,
                c.name as class_name
            FROM students s
            JOIN classes c ON s.class_id = c.id
            WHERE s.id = ?
        `).bind(student_id).first() as any;

        if (!studentData) {
            throw new AppError('Student not found', 404)
        }

        // 获取最新考试 ID 用于缓存 key
        const latestExam = await c.env.DB.prepare(`
            SELECT MAX(e.id) as latest_exam_id
            FROM exams e
            JOIN scores s ON e.id = s.exam_id
            WHERE s.student_id = ?
        `).bind(student_id).first() as any;

        const latestExamId = latestExam?.latest_exam_id || null;
        const cacheKey = getCacheKey(student_id, latestExamId);

        // 1. 先查 KV 缓存（7天 TTL）
        const cachedComment = await c.env.KV.get(cacheKey, 'json') as any;
        if (cachedComment) {
            console.log('[AI] Cache hit (KV):', cacheKey);
            return c.json({
                success: true,
                comment: cachedComment.comment,
                metadata: cachedComment.metadata,
                cached: true,
                source: 'kv'
            })
        }

        // 2. 查数据库历史记录
        const dbComment = await c.env.DB.prepare(`
            SELECT comment, metadata, created_at
            FROM ai_comments
            WHERE student_id = ? AND exam_id IS ?
            ORDER BY created_at DESC
            LIMIT 1
        `).bind(student_id, latestExamId).first() as any;

        if (dbComment) {
            console.log('[AI] Cache hit (DB)');
            const result = {
                comment: dbComment.comment,
                metadata: JSON.parse(dbComment.metadata || '{}'),
                cached: true,
                source: 'database'
            };

            // 回写到 KV 缓存
            await c.env.KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 60 * 60 * 24 * 7 });

            return c.json({ success: true, ...result })
        }

        console.log('[AI] Cache miss, generating new comment...');

        // 3. 缓存未命中，执行 AI 生成
        // 合并查询优化：一次性获取所有统计数据
        const stats = await c.env.DB.prepare(`
            WITH student_scores AS (
                SELECT 
                    s.score,
                    e.exam_date,
                    c.name as course_name,
                    e.name as exam_name,
                    ec.full_score
                FROM scores s
                JOIN exams e ON s.exam_id = e.id
                JOIN courses c ON s.course_id = c.id
                JOIN exam_courses ec ON s.exam_id = ec.exam_id AND s.course_id = ec.course_id
                WHERE s.student_id = ?
                ORDER BY e.exam_date ASC
            )
            SELECT 
                AVG(score) as avg_score,
                COUNT(*) as total_scores,
                json_group_array(
                    json_object(
                        'score', score,
                        'exam_date', exam_date,
                        'course_name', course_name,
                        'exam_name', exam_name,
                        'full_score', full_score
                    )
                ) as all_data
            FROM student_scores
        `).bind(student_id).first() as any;

        const avgScore = stats?.avg_score || 0;
        const allData = stats?.all_data ? JSON.parse(stats.all_data) : [];

        // 计算科目表现
        const subjectMap = new Map<string, number[]>();
        allData.forEach((item: any) => {
            if (!subjectMap.has(item.course_name)) {
                subjectMap.set(item.course_name, []);
            }
            subjectMap.get(item.course_name)!.push(item.score);
        });

        const subjectAvgs = Array.from(subjectMap.entries())
            .map(([name, scores]) => ({
                name,
                avg: scores.reduce((a, b) => a + b, 0) / scores.length
            }))
            .sort((a, b) => b.avg - a.avg);

        const strongSubjects = subjectAvgs.length > 0
            ? subjectAvgs.slice(0, 2).map(s => s.name).join('、')
            : '暂无';
        const weakSubjects = subjectAvgs.length > 0
            ? subjectAvgs.slice(-2).map(s => s.name).join('、')
            : '暂无';

        // 趋势分析
        let trend = '稳定';
        let trendDescription = '成绩保持稳定';

        if (allData.length >= 3) {
            const sortedScores = [...allData].sort((a: any, b: any) =>
                new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
            );

            const n = sortedScores.length;
            let sum_x = 0, sum_y = 0, sum_xy = 0, sum_xx = 0;

            sortedScores.forEach((item: any, index: number) => {
                const x = index + 1;
                const y = item.score;
                sum_x += x;
                sum_y += y;
                sum_xy += x * y;
                sum_xx += x * x;
            });

            const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
            const scoreChange = sortedScores[n - 1].score - sortedScores[0].score;

            if (slope > 2 || scoreChange > 10) {
                trend = '显著进步';
                trendDescription = `整体呈上升趋势，最近成绩比初期提高了${scoreChange.toFixed(1)}分`;
            } else if (slope > 0.5 || scoreChange > 5) {
                trend = '进步';
                trendDescription = `稳步提升中，最近成绩比初期提高了${scoreChange.toFixed(1)}分`;
            } else if (slope < -2 || scoreChange < -10) {
                trend = '显著退步';
                trendDescription = `整体呈下降趋势，最近成绩比初期下降了${Math.abs(scoreChange).toFixed(1)}分`;
            } else if (slope < -0.5 || scoreChange < -5) {
                trend = '退步';
                trendDescription = `有所下滑，最近成绩比初期下降了${Math.abs(scoreChange).toFixed(1)}分`;
            } else {
                trend = '稳定';
                trendDescription = `成绩保持稳定，波动范围在${Math.abs(scoreChange).toFixed(1)}分以内`;
            }
        }

        // 格式化考试历史
        const examMap = new Map<string, any[]>();
        allData.forEach((item: any) => {
            if (!examMap.has(item.exam_name)) {
                examMap.set(item.exam_name, []);
            }
            examMap.get(item.exam_name)!.push(item);
        });

        let examHistoryText = '';
        examMap.forEach((subjects, examName) => {
            examHistoryText += `\n- ${examName} (${subjects[0].exam_date}): `;
            examHistoryText += subjects.map((s: any) =>
                `${s.course_name} ${s.score}/${s.full_score}分`
            ).join(', ');
        });

        if (!examHistoryText) {
            examHistoryText = '\n- 暂无考试记录';
        }

        // 生成优化的 Prompt
        const prompt = generateOptimizedPrompt({
            studentName: studentData.name,
            className: studentData.class_name,
            avgScore,
            trend,
            trendDescription,
            strongSubjects,
            weakSubjects,
            examHistoryText
        });

        console.log('[AI] Prompt generated, length:', prompt.length);

        // 调用 AI
        try {
            const response = await c.env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8' as any, {
                messages: [
                    { role: "user", content: prompt }
                ],
                max_tokens: 220,
                temperature: 0.7
            }) as any

            console.log('[AI] Response received');

            let comment = '评语生成失败';

            if (response.response && typeof response.response === 'string') {
                comment = response.response;
            } else if (response.result?.response && typeof response.result.response === 'string') {
                comment = response.result.response;
            } else if (typeof response === 'string') {
                comment = response;
            }

            if (typeof comment !== 'string' || comment === '评语生成失败') {
                console.error('[AI] Unexpected response format:', response);
                comment = '评语生成失败';
            }

            const metadata = {
                student_name: studentData.name,
                avg_score: avgScore.toFixed(1),
                trend,
                strong_subjects: strongSubjects,
                weak_subjects: weakSubjects
            };

            // 保存到数据库
            await c.env.DB.prepare(`
                INSERT INTO ai_comments (student_id, exam_id, comment, metadata)
                VALUES (?, ?, ?, ?)
            `).bind(
                student_id,
                latestExamId,
                comment.trim(),
                JSON.stringify(metadata)
            ).run();

            // 写入 KV 缓存（7天过期）
            const cacheData = {
                comment: comment.trim(),
                metadata
            };
            await c.env.KV.put(cacheKey, JSON.stringify(cacheData), {
                expirationTtl: 60 * 60 * 24 * 7
            });

            console.log('[AI] Comment saved to DB and KV cache');

            return c.json({
                success: true,
                comment: comment.trim(),
                metadata,
                cached: false
            })
        } catch (aiError: any) {
            console.error('[AI] Generation error:', aiError);
            throw new AppError(`AI调用失败: ${aiError.message || aiError.toString()}`, 500);
        }
    } catch (error) {
        console.error('[AI] Generate comment error:', error)
        throw new AppError('Failed to generate comment', 500)
    }
})

// Get comment history for a student
ai.get('/comments/:student_id', async (c) => {
    const studentId = parseInt(c.req.param('student_id'))

    try {
        const comments = await c.env.DB.prepare(`
            SELECT 
                id,
                exam_id,
                comment,
                metadata,
                edited,
                created_at,
                updated_at
            FROM ai_comments
            WHERE student_id = ?
            ORDER BY created_at DESC
        `).bind(studentId).all()

        return c.json({
            success: true,
            comments: comments.results?.map((r: any) => ({
                ...r,
                metadata: JSON.parse(r.metadata || '{}')
            })) || []
        })
    } catch (error) {
        console.error('[AI] Get comment history error:', error)
        throw new AppError('Failed to get comment history', 500)
    }
})

// Update a comment
ai.put('/comments/:id', async (c) => {
    const commentId = parseInt(c.req.param('id'))
    const { comment } = await c.req.json()

    try {
        await c.env.DB.prepare(`
            UPDATE ai_comments
            SET comment = ?, edited = 1
            WHERE id = ?
        `).bind(comment, commentId).run()

        return c.json({ success: true })
    } catch (error) {
        console.error('[AI] Update comment error:', error)
        throw new AppError('Failed to update comment', 500)
    }
})

// Delete a comment
ai.delete('/comments/:id', async (c) => {
    const commentId = parseInt(c.req.param('id'))

    try {
        await c.env.DB.prepare(`
            DELETE FROM ai_comments WHERE id = ?
        `).bind(commentId).run()

        return c.json({ success: true })
    } catch (error) {
        console.error('[AI] Delete comment error:', error)
        throw new AppError('Failed to delete comment', 500)
    }
})

export default ai