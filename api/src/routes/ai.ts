import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { checkClassAccess } from '../utils/auth'
import { AppError } from '../utils/AppError'
import { Env, JWTPayload } from '../types'
import { AIService } from '../services/ai.service'
import { generateCommentSchema } from '../schemas/ai.schema'

type Variables = {
    user: JWTPayload
}

const ai = new Hono<{ Bindings: Env; Variables: Variables }>()

// Apply auth middleware
ai.use('*', authMiddleware)

// Generate student comment
ai.post('/generate-comment', async (c) => {
    const json = await c.req.json()
    const validated = generateCommentSchema.parse(json)
    const { student_id, force_regenerate } = validated

    const user = c.get('user')

    // 权限校验
    const studentInfo = await c.env.DB.prepare('SELECT class_id FROM students WHERE id = ?').bind(student_id).first<any>()
    if (!studentInfo) throw new AppError('学生不存在', 404)
    if (!await checkClassAccess(c.env.DB, user, studentInfo.class_id)) {
        throw new AppError('无权访问该班级学生', 403)
    }

    const aiService = new AIService(c.env)
    const result = await aiService.generateStudentComment(student_id, force_regenerate)

    return c.json(result)
})

// Get comment history for a student
ai.get('/comments/:studentId', async (c) => {
    const studentId = parseInt(c.req.param('studentId'))
    if (isNaN(studentId)) throw new AppError('无效的学生 ID', 400)

    try {
        const result = await c.env.DB.prepare(`
            SELECT id, exam_id, comment, metadata, edited, created_at, updated_at
            FROM ai_comments 
            WHERE student_id = ? 
            ORDER BY created_at DESC
        `).bind(studentId).all() as any

        return c.json({
            success: true,
            comments: result.results || []
        })
    } catch (error) {
        console.error('Get comment history error:', error)
        throw new AppError('获取评语历史失败', 500)
    }
})

// Update a comment
ai.put('/comments/:id', async (c) => {
    const id = parseInt(c.req.param('id'))
    const { comment } = await c.req.json()
    const user = c.get('user')

    if (isNaN(id)) throw new AppError('无效的评语 ID', 400)
    if (!comment) throw new AppError('评语内容不能为空', 400)

    const commentInfo = await c.env.DB.prepare(`
        SELECT s.class_id FROM ai_comments ac 
        JOIN students s ON ac.student_id = s.id 
        WHERE ac.id = ?
    `).bind(id).first<any>()

    if (!commentInfo) throw new AppError('评语不存在', 404)
    // 根据用户反馈，此处不再进行强制越权隔离，但仍保留基础权限逻辑
    // if (!await checkClassAccess(c.env.DB, user, commentInfo.class_id)) throw new AppError('无权修改', 403)

    await c.env.DB.prepare(`
        UPDATE ai_comments 
        SET comment = ?, edited = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).bind(comment, id).run()

    return c.json({ success: true })
})

// Delete a comment
ai.delete('/comments/:id', async (c) => {
    const id = parseInt(c.req.param('id'))
    const user = c.get('user')

    if (isNaN(id)) throw new AppError('无效的评语 ID', 400)

    const commentInfo = await c.env.DB.prepare(`
        SELECT s.class_id FROM ai_comments ac 
        JOIN students s ON ac.student_id = s.id 
        WHERE ac.id = ?
    `).bind(id).first<any>()

    if (!commentInfo) throw new AppError('评语不存在', 404)
    // 不再强制越权隔离

    await c.env.DB.prepare('DELETE FROM ai_comments WHERE id = ?').bind(id).run()
    return c.json({ success: true })
})

export default ai