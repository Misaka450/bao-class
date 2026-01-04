import { Hono } from 'hono';
import { Env, JWTPayload } from '../types';
import { LessonPrepService } from '../services/lesson-prep.service';
import { authMiddleware } from '../middleware/auth';

const lessonPrep = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// 所有路由需要认证
lessonPrep.use('*', authMiddleware);

/**
 * 生成教案（流式）
 * POST /api/lesson-prep/generate/stream
 * 
 * Body: { subject, grade, volume, topic, classId? }
 */
lessonPrep.post('/generate/stream', async (c) => {
    const { subject, grade, volume, topic, classId } = await c.req.json();

    if (!subject || !grade || !volume || !topic) {
        return c.json({ error: '请填写科目、年级、册次和教学内容' }, 400);
    }

    const service = new LessonPrepService(c.env);

    // 获取班级学情（如果提供了 classId）
    let classPerformance;
    if (classId) {
        classPerformance = await service.getClassPerformance(classId);
    }

    // 流式生成教案
    return service.generateLessonPlanStream(c, {
        subject,
        grade: parseInt(grade),
        volume: parseInt(volume),
        topic,
        classId,
        classPerformance: classPerformance || undefined
    });
});

/**
 * 根据反馈优化教案（流式）
 * POST /api/lesson-prep/refine/stream
 * 
 * Body: { originalContent, feedback, subject, grade, volume, topic }
 */
lessonPrep.post('/refine/stream', async (c) => {
    const { originalContent, feedback, subject, grade, volume, topic } = await c.req.json();

    if (!originalContent || !feedback) {
        return c.json({ error: '请提供原教案内容和修改意见' }, 400);
    }

    const service = new LessonPrepService(c.env);

    return service.refineLessonPlanStream(c, originalContent, feedback, {
        subject: subject || 'custom',
        grade: parseInt(grade) || 0,
        volume: parseInt(volume) || 0,
        topic: topic || ''
    });
});

/**
 * 保存教案
 * POST /api/lesson-prep/save
 */
lessonPrep.post('/save', async (c) => {
    const user = c.get('user');
    const { title, content, subject, grade, volume, classId } = await c.req.json();

    if (!title || !content) {
        return c.json({ error: '缺少必要参数' }, 400);
    }

    const service = new LessonPrepService(c.env);
    const id = await service.saveLessonPlan(
        user.userId,
        title,
        content,
        subject || 'custom',
        grade || 0,
        volume || 0,
        classId
    );

    return c.json({
        success: true,
        id,
        message: '教案保存成功'
    });
});

/**
 * 获取我的教案列表
 * GET /api/lesson-prep/my-plans
 */
lessonPrep.get('/my-plans', async (c) => {
    const user = c.get('user');
    const service = new LessonPrepService(c.env);
    const plans = await service.getUserLessonPlans(user.userId);

    return c.json({
        success: true,
        data: plans
    });
});

/**
 * 获取单个教案详情
 * GET /api/lesson-prep/plans/:id
 */
lessonPrep.get('/plans/:id', async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    const plan = await c.env.DB.prepare(`
    SELECT * FROM lesson_plans WHERE id = ? AND user_id = ?
  `).bind(id, user.userId).first();

    if (!plan) {
        return c.json({ error: '教案不存在' }, 404);
    }

    return c.json({
        success: true,
        data: plan
    });
});

/**
 * 更新教案
 * PUT /api/lesson-prep/plans/:id
 */
lessonPrep.put('/plans/:id', async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const { title, content } = await c.req.json();

    await c.env.DB.prepare(`
    UPDATE lesson_plans SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(title, content, id, user.userId).run();

    return c.json({
        success: true,
        message: '教案更新成功'
    });
});

/**
 * 删除教案
 * DELETE /api/lesson-prep/plans/:id
 */
lessonPrep.delete('/plans/:id', async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    await c.env.DB.prepare(`
    DELETE FROM lesson_plans WHERE id = ? AND user_id = ?
  `).bind(id, user.userId).run();

    return c.json({
        success: true,
        message: '教案删除成功'
    });
});

// ===================== 作业相关路由 =====================

/**
 * 生成作业题（流式）
 * POST /api/lesson-prep/homework/stream
 */
lessonPrep.post('/homework/stream', async (c) => {
    const { subject, grade, topic, difficulty, count, questionTypes } = await c.req.json();

    if (!subject || !grade || !topic) {
        return c.json({ error: '请填写科目、年级和知识点' }, 400);
    }

    const service = new LessonPrepService(c.env);

    // 支持新的 questionTypes 参数，向后兼容旧的 count 参数
    return service.generateHomeworkStream(
        c,
        subject,
        parseInt(grade),
        topic,
        difficulty || 'basic',
        questionTypes || { total: parseInt(count) || 5 }
    );
});

/**
 * 根据反馈优化作业（流式）
 * POST /api/lesson-prep/homework/refine/stream
 */
lessonPrep.post('/homework/refine/stream', async (c) => {
    const { originalContent, feedback, subject, grade, topic } = await c.req.json();

    if (!originalContent || !feedback) {
        return c.json({ error: '请提供原作业内容和修改意见' }, 400);
    }

    const service = new LessonPrepService(c.env);

    return service.refineHomeworkStream(
        c,
        originalContent,
        feedback,
        subject || 'custom',
        parseInt(grade) || 0,
        topic || ''
    );
});

/**
 * 保存作业
 * POST /api/lesson-prep/homework/save
 */
lessonPrep.post('/homework/save', async (c) => {
    const user = c.get('user');
    const { title, content, subject, grade, topic, difficulty } = await c.req.json();

    if (!title || !content) {
        return c.json({ error: '缺少必要参数' }, 400);
    }

    const service = new LessonPrepService(c.env);
    const id = await service.saveHomework(
        user.userId,
        title,
        content,
        subject || 'custom',
        grade || 0,
        topic || '',
        difficulty || 'basic'
    );

    return c.json({
        success: true,
        id,
        message: '作业保存成功'
    });
});

/**
 * 获取我的作业列表
 * GET /api/lesson-prep/homework/list
 */
lessonPrep.get('/homework/list', async (c) => {
    const user = c.get('user');
    const service = new LessonPrepService(c.env);
    const homework = await service.getUserHomework(user.userId);

    return c.json({
        success: true,
        data: homework
    });
});

/**
 * 删除作业
 * DELETE /api/lesson-prep/homework/:id
 */
lessonPrep.delete('/homework/:id', async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    const service = new LessonPrepService(c.env);
    await service.deleteHomework(user.userId, parseInt(id));

    return c.json({
        success: true,
        message: '作业删除成功'
    });
});

export default lessonPrep;
