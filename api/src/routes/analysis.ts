import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
    AI: Ai
}

const analysis = new Hono<{ Bindings: Bindings }>()

// AI-generated class summary
analysis.get('/class/summary/:classId', async (c) => {
    const classId = c.req.param('classId')

    try {
        // Get class stats
        const stats = await c.env.DB.prepare(`
      SELECT 
        c.name as class_name,
        COUNT(DISTINCT s.student_id) as total_students,
        AVG(s.score) as average_score,
        MAX(s.score) as highest_score,
        MIN(s.score) as lowest_score
      FROM classes c
      JOIN students st ON c.id = st.class_id
      JOIN scores s ON st.id = s.student_id
      JOIN exams e ON s.exam_id = e.id
      WHERE c.id = ? AND e.exam_date >= date('now', '-30 days')
      GROUP BY c.id, c.name
    `).bind(classId).first()

        if (!stats) {
            return c.json({ error: 'No data available' }, 404)
        }

        // Generate AI summary using Workers AI
        const prompt = `作为一名资深教师，请根据以下班级成绩数据生成一份简洁的总结报告：
班级：${stats.class_name}
学生总数：${stats.total_students}
平均分：${Number(stats.average_score || 0).toFixed(2)}
最高分：${stats.highest_score}
最低分：${stats.lowest_score}

请分析班级的整体表现，指出优势和需要改进的地方。`

        const aiResponse = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
            prompt: prompt
        })

        return c.json({
            stats,
            summary: aiResponse.response || '暂无 AI 分析'
        })
    } catch (error) {
        console.error('AI summary error:', error)
        return c.json({
            error: 'Failed to generate summary',
            details: error instanceof Error ? error.message : '未知错误'
        }, 500)
    }
})

// AI-generated personalized advice for student
analysis.get('/student/advice/:studentId', async (c) => {
    const studentId = c.req.param('studentId')

    try {
        // Get student performance data
        const student = await c.env.DB.prepare(`
      SELECT 
        st.name,
        AVG(s.score) as average_score,
        GROUP_CONCAT(co.name || ':' || s.score) as subject_scores
      FROM students st
      JOIN scores s ON st.id = s.student_id
      JOIN exams e ON s.exam_id = e.id
      JOIN courses co ON e.course_id = co.id
      WHERE st.id = ?
      GROUP BY st.id, st.name
    `).bind(studentId).first()

        if (!student) {
            return c.json({ error: 'Student not found' }, 404)
        }

        const prompt = `作为一名教育专家，请为以下学生提供个性化的学习建议：
学生姓名：${student.name}
平均成绩：${Number(student.average_score || 0).toFixed(2)}
各科成绩：${student.subject_scores}

请分析学生的学习情况，给出具体的改进建议和学习方法。`

        const aiResponse = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
            prompt: prompt
        })

        return c.json({
            student: {
                name: student.name,
                average_score: student.average_score
            },
            advice: aiResponse.response || '暂无个性化建议'
        })
    } catch (error) {
        console.error('AI advice error:', error)
        return c.json({ error: 'Failed to generate advice' }, 500)
    }
})

// Identify weak students
analysis.get('/weakpoints/:classId', async (c) => {
    const classId = c.req.param('classId')

    try {
        const weakStudents = await c.env.DB.prepare(`
      SELECT 
        st.id,
        st.name,
        AVG(s.score) as average_score,
        COUNT(CASE WHEN s.score < 60 THEN 1 END) as fail_count
      FROM students st
      JOIN scores s ON st.id = s.student_id
      JOIN exams e ON s.exam_id = e.id
      WHERE st.class_id = ?
      GROUP BY st.id, st.name
      HAVING average_score < 70 OR fail_count > 0
      ORDER BY average_score ASC
      LIMIT 20
    `).bind(classId).all()

        return c.json(weakStudents.results)
    } catch (error) {
        console.error('Weakpoints error:', error)
        return c.json({ error: 'Failed to identify weak points' }, 500)
    }
})

// Student Radar Analysis (Z-score)
analysis.get('/student/radar/:studentId', async (c) => {
    const studentId = c.req.param('studentId')

    try {
        // Get student's latest scores for each course
        const studentScores = await c.env.DB.prepare(`
            SELECT 
                c.name as subject,
                s.score,
                s.exam_id,
                e.class_id
            FROM scores s
            JOIN exams e ON s.exam_id = e.id
            JOIN courses c ON e.course_id = c.id
            WHERE s.student_id = ?
            GROUP BY c.id
            ORDER BY e.exam_date DESC
        `).bind(studentId).all()

        if (!studentScores.results.length) {
            return c.json([])
        }

        const radarData = []

        for (const record of studentScores.results) {
            // Calculate class stats for this exam to compute Z-score
            // SQLite doesn't have STDDEV by default, so we calculate it manually or approximate
            const stats = await c.env.DB.prepare(`
                SELECT 
                    AVG(score) as avg_score,
                    COUNT(score) as count,
                    SUM((score - (SELECT AVG(score) FROM scores WHERE exam_id = ?)) * (score - (SELECT AVG(score) FROM scores WHERE exam_id = ?))) as sum_sq_diff
                FROM scores 
                WHERE exam_id = ?
            `).bind(record.exam_id, record.exam_id, record.exam_id, record.exam_id).first()

            if (!stats) continue;

            const avg = Number(stats.avg_score)
            const count = Number(stats.count)
            // Variance = sum_sq_diff / count
            // StdDev = Sqrt(Variance)
            const variance = count > 1 ? (Number(stats.sum_sq_diff) / count) : 0
            const stdDev = Math.sqrt(variance)

            // Z-score = (Score - Avg) / StdDev
            // If StdDev is 0 (all scores same), Z-score is 0
            const zScore = stdDev === 0 ? 0 : (Number(record.score) - avg) / stdDev

            radarData.push({
                subject: record.subject,
                score: record.score,
                classAvg: parseFloat(avg.toFixed(2)),
                zScore: parseFloat(zScore.toFixed(2)),
                fullMark: 100 // Assuming 100 for normalization if needed
            })
        }

        return c.json(radarData)
    } catch (error) {
        console.error('Radar analysis error:', error)
        return c.json({ error: 'Failed to generate radar analysis' }, 500)
    }
})

// Class Focus Group Analysis
analysis.get('/class/focus/:classId', async (c) => {
    const classId = c.req.param('classId')

    try {
        // 1. Critical Students (Borderline Pass/Fail or Excellent)
        // 58-60 (Danger of failing), 88-90 (Close to excellent)
        const criticalStudents = await c.env.DB.prepare(`
            SELECT DISTINCT st.id, st.name, 'critical' as type, s.score, c.name as subject
            FROM students st
            JOIN scores s ON st.id = s.student_id
            JOIN exams e ON s.exam_id = e.id
            JOIN courses c ON e.course_id = c.id
            WHERE st.class_id = ? 
            AND e.exam_date >= date('now', '-30 days')
            AND ((s.score BETWEEN 58 AND 59.9) OR (s.score BETWEEN 88 AND 89.9))
        `).bind(classId).all()

        // 2. Regressing Students (Rank dropped significantly)
        // This is complex in SQL, simplified: compare average score of last 2 exams
        // For now, let's just find students whose latest exam score is significantly lower than their average
        const regressingStudents = await c.env.DB.prepare(`
            SELECT st.id, st.name, 'regressing' as type, 
                   (AVG(s.score) - (
                       SELECT s2.score 
                       FROM scores s2 
                       JOIN exams e2 ON s2.exam_id = e2.id 
                       WHERE s2.student_id = st.id 
                       ORDER BY e2.exam_date DESC LIMIT 1
                   )) as drop_amount
            FROM students st
            JOIN scores s ON st.id = s.student_id
            WHERE st.class_id = ?
            GROUP BY st.id
            HAVING drop_amount > 10
        `).bind(classId).all()

        // 3. Fluctuating Students (High Variance)
        // Using difference between Max and Min score as a simple proxy for variance/fluctuation
        const fluctuatingStudents = await c.env.DB.prepare(`
            SELECT st.id, st.name, 'fluctuating' as type,
                   (MAX(s.score) - MIN(s.score)) as score_diff
            FROM students st
            JOIN scores s ON st.id = s.student_id
            WHERE st.class_id = ?
            GROUP BY st.id
            HAVING score_diff > 20
        `).bind(classId).all()

        return c.json({
            critical: criticalStudents.results,
            regressing: regressingStudents.results,
            fluctuating: fluctuatingStudents.results
        })
    } catch (error) {
        console.error('Focus group error:', error)
        return c.json({ error: 'Failed to generate focus group' }, 500)
    }
})

export default analysis
