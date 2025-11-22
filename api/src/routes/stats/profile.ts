import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const profile = new Hono<{ Bindings: Bindings }>()

// Get comprehensive student profile
profile.get('/:studentId', async (c) => {
    const studentId = c.req.param('studentId')

    try {
        // 1. Basic Student Info
        const student = await c.env.DB.prepare(`
            SELECT s.*, c.name as class_name, c.id as class_id
            FROM students s
            JOIN classes c ON s.class_id = c.id
            WHERE s.id = ?
        `).bind(studentId).first()

        if (!student) {
            return c.json({ error: 'Student not found' }, 404)
        }

        // 2. Exam History (with Rank and Class Avg)
        // Get all exams the student participated in
        const examHistory = await c.env.DB.prepare(`
            SELECT 
                e.id as exam_id,
                e.name as exam_name,
                e.exam_date,
                SUM(s.score) as total_score,
                COUNT(s.id) as subject_count
            FROM exams e
            JOIN scores s ON e.id = s.exam_id
            WHERE s.student_id = ?
            GROUP BY e.id, e.name, e.exam_date
            ORDER BY e.exam_date DESC
            LIMIT 20
        `).bind(studentId).all()

        const historyWithRank = []
        for (const exam of examHistory.results as any[]) {
            // Calculate Class Rank and Average for this exam
            const classStats = await c.env.DB.prepare(`
                SELECT 
                    student_id,
                    SUM(score) as total
                FROM scores
                WHERE exam_id = ?
                AND student_id IN (SELECT id FROM students WHERE class_id = ?)
                GROUP BY student_id
                ORDER BY total DESC
            `).bind(exam.exam_id, student.class_id).all()

            const ranks = classStats.results as any[]
            const rank = ranks.findIndex(r => r.student_id === Number(studentId)) + 1
            const totalSum = ranks.reduce((acc, curr) => acc + (curr.total as number), 0)
            const classAvg = ranks.length > 0 ? totalSum / ranks.length : 0

            // Get subject details for this exam
            const subjectScores = await c.env.DB.prepare(`
                SELECT c.name as subject, s.score, s.course_id
                FROM scores s
                JOIN courses c ON s.course_id = c.id
                WHERE s.student_id = ? AND s.exam_id = ?
            `).bind(studentId, exam.exam_id).all()

            const subjectDetails = []
            for (const sub of subjectScores.results as any[]) {
                // Get class average for this subject
                const subAvg = await c.env.DB.prepare(`
                    SELECT AVG(s.score) as avg
                    FROM scores s
                    JOIN students st ON s.student_id = st.id
                    WHERE s.exam_id = ? AND s.course_id = ? AND st.class_id = ?
                `).bind(exam.exam_id, sub.course_id, student.class_id).first()

                // Get class rank for this subject
                const rankResult = await c.env.DB.prepare(`
                    SELECT COUNT(*) as count
                    FROM scores s
                    JOIN students st ON s.student_id = st.id
                    WHERE s.exam_id = ? AND s.course_id = ? AND st.class_id = ? AND s.score > ?
                `).bind(exam.exam_id, sub.course_id, student.class_id, sub.score).first()

                const rank = (rankResult?.count as number || 0) + 1

                subjectDetails.push({
                    subject: sub.subject,
                    score: sub.score,
                    class_avg: subAvg ? parseFloat((subAvg.avg as number).toFixed(2)) : 0,
                    class_rank: rank
                })
            }

            historyWithRank.push({
                exam_id: exam.exam_id,
                exam_name: exam.exam_name,
                exam_date: exam.exam_date,
                total_score: exam.total_score,
                class_rank: rank,
                class_avg: parseFloat(classAvg.toFixed(2)),
                total_students: ranks.length,
                subjects: subjectDetails
            })
        }

        // 3. Radar Data (Z-Scores for latest exam)
        // Find latest exam
        const latestExam = historyWithRank.length > 0 ? historyWithRank[0] : null
        const radarData: {
            subject: string;
            score: number;
            classAvg: number;
            zScore: number;
            fullMark: number;
        }[] = []

        if (latestExam) {
            const courses = await c.env.DB.prepare('SELECT id, name FROM courses').all()

            for (const course of courses.results as any[]) {
                // Student Score
                const scoreRecord = await c.env.DB.prepare(`
                    SELECT score FROM scores 
                    WHERE student_id = ? AND exam_id = ? AND course_id = ?
                `).bind(studentId, latestExam.exam_id, course.id).first()

                if (!scoreRecord) continue

                // Class Stats for Z-Score
                const stats = await c.env.DB.prepare(`
                    SELECT AVG(s.score) as avg, SUM((s.score - (SELECT AVG(score) FROM scores WHERE exam_id = ? AND course_id = ? AND student_id IN (SELECT id FROM students WHERE class_id = ?))) * (s.score - (SELECT AVG(score) FROM scores WHERE exam_id = ? AND course_id = ? AND student_id IN (SELECT id FROM students WHERE class_id = ?)))) / COUNT(s.score) as variance
                    FROM scores s
                    JOIN students st ON s.student_id = st.id
                    WHERE s.exam_id = ? AND s.course_id = ? AND st.class_id = ?
                `).bind(
                    latestExam.exam_id, course.id, student.class_id,
                    latestExam.exam_id, course.id, student.class_id,
                    latestExam.exam_id, course.id, student.class_id
                ).first()

                // Simplified Variance Calculation to avoid complex SQL nesting issues if any
                // Actually let's do it in two steps for safety if the above is too complex for D1/SQLite
                const classScores = await c.env.DB.prepare(`
                    SELECT s.score 
                    FROM scores s
                    JOIN students st ON s.student_id = st.id
                    WHERE s.exam_id = ? AND s.course_id = ? AND st.class_id = ?
                `).bind(latestExam.exam_id, course.id, student.class_id).all()

                const scores = classScores.results.map((r: any) => r.score as number)
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length
                const stdDev = Math.sqrt(variance)
                const zScore = stdDev === 0 ? 0 : (Number(scoreRecord.score) - avg) / stdDev

                radarData.push({
                    subject: course.name,
                    score: Number(scoreRecord.score),
                    classAvg: parseFloat(avg.toFixed(2)),
                    zScore: parseFloat(zScore.toFixed(2)),
                    fullMark: 100 // Assuming 100 for now, ideally fetch from exam_courses
                })
            }
        }

        const weakSubjects = radarData
            .filter(r => r.zScore < -1 || r.score < 60)
            .map(r => ({
                subject: r.subject,
                score: r.score,
                zScore: r.zScore,
                reason: r.score < 60 ? '不及格' : '显著低于班级平均'
            }))

        return c.json({
            student: {
                id: student.id,
                name: student.name,
                student_id: student.student_id,
                class_name: student.class_name
            },
            history: historyWithRank.reverse(), // Oldest to Newest for charts
            radar: radarData,
            weak_subjects: weakSubjects
        })

    } catch (error) {
        console.error('Profile error:', error)
        return c.json({
            error: 'Failed to fetch student profile',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500)
    }
})

export default profile
