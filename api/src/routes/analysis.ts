import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'

type Bindings = {
    DB: D1Database
    AI: Ai
}

const analysis = new Hono<{ Bindings: Bindings }>()

// Apply auth middleware to all routes
analysis.use('*', authMiddleware)

// Class Focus Group Analysis
analysis.get('/class/focus/:classId', async (c) => {
    const classId = c.req.param('classId')

    try {
        // Get latest exam for specific analysis
        const latestExam = await c.env.DB.prepare('SELECT id FROM exams ORDER BY exam_date DESC LIMIT 1').first()
        const examId = latestExam?.id

        // 1. Critical Students (Borderline Pass/Fail or Excellent)
        // 58-60 (Danger of failing), 88-90 (Close to excellent)
        const criticalStudents = await c.env.DB.prepare(`
            SELECT DISTINCT st.id, st.name, 'critical' as type, s.score, c.name as subject
            FROM students st
            JOIN scores s ON st.id = s.student_id
            JOIN exams e ON s.exam_id = e.id
            JOIN courses c ON s.course_id = c.id
            WHERE st.class_id = ?
            AND e.exam_date >= date('now', '-30 days')
            AND ((s.score BETWEEN 58 AND 59.9) OR (s.score BETWEEN 88 AND 89.9))
        `).bind(classId).all()

        // Check if we have enough exams for trend analysis (at least 2)
        const exams = await c.env.DB.prepare(`
            SELECT DISTINCT e.id 
            FROM exams e 
            JOIN scores s ON e.id = s.exam_id 
            JOIN students st ON s.student_id = st.id 
            WHERE st.class_id = ?
        `).bind(classId).all()

        let regressingStudents: any = { results: [] }
        let fluctuatingStudents: any = { results: [] }

        if (exams.results && exams.results.length >= 2) {
            // 2. Regressing Students (Rank dropped significantly)
            // Compare overall average score vs latest exam average score
            regressingStudents = await c.env.DB.prepare(`
                WITH StudentExamAverages AS (
                    SELECT s.student_id, st.name, s.exam_id, e.exam_date, AVG(s.score) as avg_score
                    FROM scores s
                    JOIN exams e ON s.exam_id = e.id
                    JOIN students st ON s.student_id = st.id
                    WHERE st.class_id = ?
                    GROUP BY s.student_id, s.exam_id
                ),
                StudentStats AS (
                    SELECT 
                        student_id, 
                        name,
                        AVG(avg_score) as overall_avg,
                        (
                            SELECT avg_score 
                            FROM StudentExamAverages sea2 
                            WHERE sea2.student_id = sea1.student_id 
                            ORDER BY exam_date DESC 
                            LIMIT 1
                        ) as latest_score
                    FROM StudentExamAverages sea1
                    GROUP BY student_id
                )
                SELECT student_id as id, name, 'regressing' as type, 
                (overall_avg - latest_score) as drop_amount
                FROM StudentStats
                WHERE drop_amount > 10
            `).bind(classId).all()

            // 3. Fluctuating Students (High Variance in specific subjects)
            // Difference between Max and Min score for the SAME subject across exams
            fluctuatingStudents = await c.env.DB.prepare(`
                SELECT st.id, st.name, 'fluctuating' as type, c.name as subject,
                (MAX(s.score) - MIN(s.score)) as score_diff
                FROM scores s
                JOIN students st ON s.student_id = st.id
                JOIN courses c ON s.course_id = c.id
                JOIN exams e ON s.exam_id = e.id
                WHERE st.class_id = ?
                GROUP BY s.student_id, s.course_id
                HAVING score_diff > 20
            `).bind(classId).all()
        }

        // 4. Imbalanced Students (Total Rank Top 50% BUT has failed subject)
        // Simplified: Total Score > Class Avg BUT has score < 60
        const imbalancedStudents = await c.env.DB.prepare(`
            SELECT DISTINCT st.id, st.name, 'imbalanced' as type,
            s.score as failed_score, c.name as subject
            FROM students st
            JOIN scores s ON st.id = s.student_id
            JOIN courses c ON s.course_id = c.id
            WHERE st.class_id = ?
            AND s.exam_id = ?
            AND s.score < 60
            AND st.id IN (
                SELECT student_id 
                FROM scores 
                WHERE exam_id = ?
                GROUP BY student_id 
                HAVING SUM(score) > (
                    SELECT AVG(total) FROM (
                        SELECT SUM(score) as total 
                        FROM scores 
                        WHERE exam_id = ?
                        GROUP BY student_id
                    )
                )
            )
        `).bind(classId, examId || 0, examId || 0, examId || 0).all()

        return c.json({
            critical: criticalStudents.results,
            regressing: regressingStudents.results,
            fluctuating: fluctuatingStudents.results,
            imbalanced: imbalancedStudents.results
        })
    } catch (error) {
        console.error('Focus group error:', error)
        return c.json({ error: 'Failed to generate focus group' }, 500)
    }
})

export default analysis
