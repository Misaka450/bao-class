import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const gradeComparison = new Hono<{ Bindings: Bindings }>()

// Get grade comparison data
gradeComparison.get('/:classId', async (c) => {
    const classId = c.req.param('classId')
    const examId = c.req.query('examId')

    try {
        // Get class info
        const classInfo = await c.env.DB.prepare('SELECT name, grade FROM classes WHERE id = ?').bind(classId).first<{ name: string, grade: number }>()
        if (!classInfo) {
            return c.json({ error: 'Class not found' }, 404)
        }

        // Determine which exam to analyze
        let targetExamId = examId
        let examInfo: any

        if (!targetExamId) {
            // Get the latest exam for this class
            const latestExam = await c.env.DB.prepare(
                'SELECT id, name, exam_date FROM exams WHERE class_id = ? ORDER BY exam_date DESC LIMIT 1'
            ).bind(classId).first<{ id: number, name: string, exam_date: string }>()

            if (!latestExam) {
                return c.json({ error: 'No exams found for this class' }, 404)
            }

            targetExamId = latestExam.id.toString()
            examInfo = latestExam
        } else {
            examInfo = await c.env.DB.prepare(
                'SELECT id, name, exam_date FROM exams WHERE id = ?'
            ).bind(targetExamId).first()
        }

        // Get all classes in the same grade
        const gradeClasses = await c.env.DB.prepare(
            'SELECT id, name FROM classes WHERE grade = ? ORDER BY name'
        ).bind(classInfo.grade).all<{ id: number, name: string }>()

        // For each class, calculate their average score in this exam (by exam name, not exam id)
        const classesData: Array<{
            class_id: number,
            class_name: string,
            average_score: number,
            student_count: number,
            rank?: number
        }> = []

        for (const cls of gradeClasses.results) {
            // Find the exam with same name for this class
            const classExam = await c.env.DB.prepare(
                'SELECT id FROM exams WHERE class_id = ? AND name = ? AND exam_date = ?'
            ).bind(cls.id, examInfo.name, examInfo.exam_date).first<{ id: number }>()

            if (!classExam) continue

            // Calculate average total score for this class in this exam
            const avgQuery = `
                SELECT 
                    COUNT(DISTINCT st.id) as student_count,
                    AVG(student_totals.total_score) as average_score
                FROM students st
                LEFT JOIN (
                    SELECT 
                        student_id,
                        SUM(score) as total_score
                    FROM scores
                    WHERE exam_id = ?
                    GROUP BY student_id
                ) student_totals ON st.id = student_totals.student_id
                WHERE st.class_id = ?
            `

            const avgResult = await c.env.DB.prepare(avgQuery).bind(classExam.id, cls.id).first<{
                student_count: number,
                average_score: number
            }>()

            classesData.push({
                class_id: cls.id,
                class_name: cls.name,
                average_score: avgResult?.average_score ? parseFloat(Number(avgResult.average_score).toFixed(2)) : 0,
                student_count: avgResult?.student_count || 0
            })
        }

        // Sort by average score descending and assign ranks
        classesData.sort((a, b) => b.average_score - a.average_score)
        classesData.forEach((cls, index) => {
            cls.rank = index + 1
        })

        // Find current class rank
        const currentClassData = classesData.find(c => c.class_id.toString() === classId)

        // Get previous exam rank change (optional enhancement)
        let rankChange = 0
        // TODO: Implement rank change calculation by comparing with previous exam

        return c.json({
            exam_info: {
                exam_name: examInfo.name,
                exam_date: examInfo.exam_date
            },
            classes: classesData,
            current_class: {
                class_id: parseInt(classId),
                rank: currentClassData?.rank || 0,
                rank_change: rankChange
            }
        })

    } catch (error) {
        console.error('Grade comparison error:', error)
        return c.json({ error: 'Failed to fetch grade comparison', details: error instanceof Error ? error.message : String(error) }, 500)
    }
})

export default gradeComparison
