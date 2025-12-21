import { Hono } from 'hono'

type Bindings = {
    DB: D1Database
}

const distribution = new Hono<{ Bindings: Bindings }>()

// Get score distribution for an exam
distribution.get('/:examId', async (c) => {
    const examId = c.req.param('examId')
    const courseId = c.req.query('courseId')

    try {
        let query: string
        const params: (string | number)[] = [examId]
        let allRanges: string[]

        if (courseId) {
            // 单科分布 (0-100)
            query = `
                SELECT 
                    CASE 
                        WHEN score >= 90 THEN '100-90'
                        WHEN score >= 80 THEN '89-80'
                        WHEN score >= 70 THEN '79-70'
                        WHEN score >= 60 THEN '69-60'
                        ELSE '0-59'
                    END as range,
                    COUNT(*) as count
                FROM scores
                WHERE exam_id = ? AND course_id = ?
                GROUP BY range
            `
            params.push(courseId)
            allRanges = ['100-90', '89-80', '79-70', '69-60', '0-59']
        } else {
            // 全科总分分布 (假设满分300)
            query = `
                SELECT 
                    CASE 
                        WHEN total_score >= 270 THEN '300-270'
                        WHEN total_score >= 240 THEN '269-240'
                        WHEN total_score >= 210 THEN '239-210'
                        WHEN total_score >= 180 THEN '209-180'
                        ELSE '0-179'
                    END as range,
                    COUNT(*) as count
                FROM (
                    SELECT student_id, SUM(score) as total_score
                    FROM scores
                    WHERE exam_id = ?
                    GROUP BY student_id
                ) student_scores
                GROUP BY range
            `
            allRanges = ['300-270', '269-240', '239-210', '209-180', '0-179']
        }

        const result = await c.env.DB.prepare(query).bind(...params).all()

        const distributionData = allRanges.map(range => ({
            range,
            count: (result.results.find((r: any) => r.range === range) as any)?.count || 0
        }))

        return c.json(distributionData)
    } catch (error) {
        console.error('Distribution error:', error)
        return c.json({ error: 'Failed to get distribution' }, 500)
    }
})

export default distribution
