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
 * Body: { catalogId, classId? }
 */
lessonPrep.post('/generate/stream', async (c) => {
    const { catalogId, classId } = await c.req.json();

    if (!catalogId) {
        return c.json({ error: '缺少 catalogId' }, 400);
    }

    // 获取教材目录信息
    const catalog = await c.env.DB.prepare(`
    SELECT * FROM textbook_catalog WHERE id = ?
  `).bind(catalogId).first<any>();

    if (!catalog) {
        return c.json({ error: '教材目录不存在' }, 404);
    }

    const service = new LessonPrepService(c.env);

    // 获取班级学情（如果提供了 classId）
    let classPerformance;
    if (classId) {
        classPerformance = await service.getClassPerformance(classId);
    }

    // 检索相关教材内容
    const textbookContent = await service.retrieveTextbookContent(
        catalog.subject,
        catalog.grade,
        catalog.volume,
        `${catalog.unit_name} ${catalog.lesson_name || ''}`
    );

    // 流式生成教案
    return service.generateLessonPlanStream(c, {
        catalogId,
        unitName: catalog.unit_name,
        lessonName: catalog.lesson_name,
        subject: catalog.subject,
        grade: catalog.grade,
        volume: catalog.volume,
        classId,
        classPerformance: classPerformance || undefined,
        textbookContent: textbookContent.join('\n')
    });
});

/**
 * 生成教案（非流式）
 * POST /api/lesson-prep/generate
 */
lessonPrep.post('/generate', async (c) => {
    const { catalogId, classId } = await c.req.json();

    if (!catalogId) {
        return c.json({ error: '缺少 catalogId' }, 400);
    }

    const catalog = await c.env.DB.prepare(`
    SELECT * FROM textbook_catalog WHERE id = ?
  `).bind(catalogId).first<any>();

    if (!catalog) {
        return c.json({ error: '教材目录不存在' }, 404);
    }

    const service = new LessonPrepService(c.env);

    let classPerformance;
    if (classId) {
        classPerformance = await service.getClassPerformance(classId);
    }

    const textbookContent = await service.retrieveTextbookContent(
        catalog.subject,
        catalog.grade,
        catalog.volume,
        `${catalog.unit_name} ${catalog.lesson_name || ''}`
    );

    const content = await service.generateLessonPlan({
        catalogId,
        unitName: catalog.unit_name,
        lessonName: catalog.lesson_name,
        subject: catalog.subject,
        grade: catalog.grade,
        volume: catalog.volume,
        classId,
        classPerformance: classPerformance || undefined,
        textbookContent: textbookContent.join('\n')
    });

    return c.json({
        success: true,
        content
    });
});

/**
 * 保存教案
 * POST /api/lesson-prep/save
 */
lessonPrep.post('/save', async (c) => {
    const user = c.get('user');
    const { catalogId, title, content, classId } = await c.req.json();

    if (!catalogId || !title || !content) {
        return c.json({ error: '缺少必要参数' }, 400);
    }

    const service = new LessonPrepService(c.env);
    const id = await service.saveLessonPlan(user.userId, catalogId, title, content, classId);

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
    SELECT lp.*, tc.subject, tc.grade, tc.volume, tc.unit_name, tc.lesson_name
    FROM lesson_plans lp
    JOIN textbook_catalog tc ON lp.catalog_id = tc.id
    WHERE lp.id = ? AND lp.user_id = ?
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

export default lessonPrep;
