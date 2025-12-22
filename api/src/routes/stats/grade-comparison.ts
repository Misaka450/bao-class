import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const gradeComparison = new Hono<{ Bindings: Bindings }>()

// Get grade comparison data
gradeComparison.get('/:classId/:examId?', async (c) => {
    const classIdParam = c.req.param('classId')
    const examIdParam = c.req.param('examId') || c.req.query('examId')

    const classId = parseInt(classIdParam)
    const examId = examIdParam ? parseInt(examIdParam) : null

    try {
        // Get class info
        const classInfo = await c.env.DB.prepare('SELECT name, grade FROM classes WHERE id = ?').bind(classId).first<{ name: string, grade: number }>()
        if (!classInfo) {
            return c.json({ error: 'Class not found' }, 404)
        }

        // Determine which exam to analyze
        let targetExamId: number | null = examId
        let examInfo: any

        if (!targetExamId) {
            // Get the latest exam for this class
            const latestExam = await c.env.DB.prepare(
                'SELECT id, name, exam_date FROM exams WHERE class_id = ? ORDER BY exam_date DESC LIMIT 1'
            ).bind(classId).first<{ id: number, name: string, exam_date: string }>()

            if (!latestExam) {
                return c.json({ error: 'No exams found for this class' }, 404)
            }

            targetExamId = latestExam.id
            examInfo = latestExam
        } else {
            examInfo = await c.env.DB.prepare(
                'SELECT id, name, exam_date FROM exams WHERE id = ?'
            ).bind(targetExamId).first()
        }

        if (!examInfo) {
            return c.json({ error: 'Exam not found' }, 404)
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

        // Optimize: Fix N+1 query - fetch all class data in one query
        const allClassesData = await c.env.DB.prepare(`
            SELECT 
                c.id as class_id,
                c.name as class_name,
                e.id as exam_id,
                COUNT(DISTINCT st.id) as student_count,
                AVG(totals.total_score) as average_score
            FROM classes c
            JOIN exams e ON c.id = e.class_id
            LEFT JOIN students st ON c.id = st.class_id
            LEFT JOIN (
                SELECT student_id, SUM(score) as total_score
                FROM scores
                WHERE exam_id IN (
                    SELECT id FROM exams WHERE class_id IN (
                        SELECT id FROM classes WHERE grade = ?
                    ) AND name = ? AND exam_date = ?
                )
                GROUP BY student_id
            ) totals ON st.id = totals.student_id
            WHERE c.grade = ? AND e.name = ? AND e.exam_date = ?
            GROUP BY c.id, c.name, e.id
        `).bind(classInfo.grade, examInfo.name, examInfo.exam_date, classInfo.grade, examInfo.name, examInfo.exam_date).all()

        // Process results
        for (const row of (allClassesData.results || []) as any[]) {
            classesData.push({
                class_id: row.class_id,
                class_name: row.class_name,
                average_score: row.average_score ? parseFloat(Number(row.average_score).toFixed(2)) : 0,
                student_count: row.student_count || 0
            })
        }

        // Sort by average score descending and assign ranks
        classesData.sort((a, b) => b.average_score - a.average_score)
        classesData.forEach((cls, index) => {
            cls.rank = index + 1
        })

        // Find current class rank
        const currentClassData = classesData.find(c => c.class_id === classId)

        // Get previous exam rank change
        let rankChange = 0

        // Find the previous exam (same grade, before current exam date)
        const previousExam = await c.env.DB.prepare(`
            SELECT e.id, e.name, e.exam_date
            FROM exams e
            WHERE e.class_id IN (
                SELECT id FROM classes WHERE grade = ?
            )
            AND e.exam_date < ?
            ORDER BY e.exam_date DESC
            LIMIT 1
        `).bind(classInfo.grade, examInfo.exam_date).first<{ id: number, name: string, exam_date: string }>()

        if (previousExam) {
            // Calculate ranks for the previous exam using the same logic
            const previousClassesData: Array<{
                class_id: number,
                average_score: number,
                rank?: number
            }> = []

            for (const cls of (gradeClasses.results || []) as any[]) {
                // Find the previous exam for this class
                const classPrevExam = await c.env.DB.prepare(
                    'SELECT id FROM exams WHERE class_id = ? AND name = ? AND exam_date = ?'
                ).bind(cls.id, previousExam.name, previousExam.exam_date).first<{ id: number }>()

                if (!classPrevExam) continue

                // Calculate average total score for previous exam
                const prevAvgQuery = `
                    SELECT AVG(student_totals.total_score) as average_score
                    FROM students st
                    LEFT JOIN (
                        SELECT student_id, SUM(score) as total_score
                        FROM scores
                        WHERE exam_id = ?
                        GROUP BY student_id
                    ) student_totals ON st.id = student_totals.student_id
                    WHERE st.class_id = ?
                `

                const prevAvgResult = await c.env.DB.prepare(prevAvgQuery).bind(classPrevExam.id, cls.id).first<{
                    average_score: number
                }>()

                previousClassesData.push({
                    class_id: cls.id,
                    average_score: prevAvgResult?.average_score ? parseFloat(Number(prevAvgResult.average_score).toFixed(2)) : 0
                })
            }

            // Sort and assign ranks for previous exam
            previousClassesData.sort((a, b) => b.average_score - a.average_score)
            previousClassesData.forEach((cls, index) => {
                cls.rank = index + 1
            })

            // Find previous rank for current class
            const previousClassData = previousClassesData.find(c => c.class_id === classId)
            const previousRank = previousClassData?.rank || 0
            const currentRank = currentClassData?.rank || 0

            // Calculate rank change (positive = improved, negative = declined)
            rankChange = previousRank - currentRank
        }

        return c.json({
            exam_info: {
                exam_name: examInfo.name,
                exam_date: examInfo.exam_date
            },
            classes: classesData,
            current_class: {
                class_id: classId,
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
