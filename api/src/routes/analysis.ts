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

export default analysis
