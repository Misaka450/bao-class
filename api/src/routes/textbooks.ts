import { Hono } from 'hono';
import { Env } from '../types';
import { TextbookService } from '../services/textbook.service';
import { authMiddleware } from '../middleware/auth';

const textbooks = new Hono<{ Bindings: Env }>();

// 所有路由需要认证
textbooks.use('*', authMiddleware);

/**
 * 上传教材 PDF
 * POST /api/textbooks/upload
 * 
 * FormData:
 * - file: PDF 文件
 * - subject: 科目 (math, chinese, english)
 * - grade: 年级 (1-6)
 * - volume: 册次 (1=上学期, 2=下学期)
 */
textbooks.post('/upload', async (c) => {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const subject = formData.get('subject') as string;
    const grade = formData.get('grade') as string;
    const volume = formData.get('volume') as string;

    if (!file || !subject || !grade || !volume) {
        return c.json({ error: '缺少必要参数: file, subject, grade, volume' }, 400);
    }

    // 构建 R2 路径
    const r2Key = `pep/${subject}/grade${grade}/vol${volume}.pdf`;

    // 上传到 R2
    await c.env.TEXTBOOKS.put(r2Key, file.stream(), {
        httpMetadata: {
            contentType: 'application/pdf'
        },
        customMetadata: {
            subject,
            grade,
            volume,
            uploadedAt: new Date().toISOString()
        }
    });

    // 在 D1 中创建初始记录（状态为 pending）
    await c.env.DB.prepare(`
    INSERT INTO textbook_catalog 
      (publisher, subject, grade, volume, unit_name, r2_path, status)
    VALUES ('pep', ?, ?, ?, '全书', ?, 'pending')
    ON CONFLICT DO NOTHING
  `).bind(subject, parseInt(grade), parseInt(volume), r2Key).run();

    // 使用 waitUntil 异步处理 PDF
    const service = new TextbookService(c.env);
    c.executionCtx.waitUntil(service.processPdfAsync(c, r2Key));

    return c.json({
        success: true,
        message: '教材上传成功，正在解析中...',
        r2Key,
        status: 'processing'
    });
});

/**
 * 获取教材目录
 * GET /api/textbooks/catalog
 * 
 * Query params:
 * - subject: 可选，筛选科目
 * - grade: 可选，筛选年级
 */
textbooks.get('/catalog', async (c) => {
    const subject = c.req.query('subject');
    const grade = c.req.query('grade');

    const service = new TextbookService(c.env);
    const catalog = await service.getCatalog(
        subject || undefined,
        grade ? parseInt(grade) : undefined
    );

    // 按年级和册次分组
    const grouped: Record<string, any> = {};
    for (const item of catalog) {
        const key = `${item.subject}-grade${item.grade}-vol${item.volume}`;
        if (!grouped[key]) {
            grouped[key] = {
                subject: item.subject,
                grade: item.grade,
                volume: item.volume,
                r2Path: item.r2_path,
                chapters: []
            };
        }
        grouped[key].chapters.push({
            id: item.id,
            unitName: item.unit_name,
            lessonName: item.lesson_name,
            pageStart: item.page_start,
            pageEnd: item.page_end
        });
    }

    return c.json({
        success: true,
        data: Object.values(grouped)
    });
});

/**
 * 获取处理状态
 * GET /api/textbooks/status/:subject/:grade/:volume
 */
textbooks.get('/status/:subject/:grade/:volume', async (c) => {
    const { subject, grade, volume } = c.req.param();
    const r2Key = `pep/${subject}/grade${grade}/vol${volume}.pdf`;

    const result = await c.env.DB.prepare(`
    SELECT status, COUNT(*) as count 
    FROM textbook_catalog 
    WHERE r2_path = ?
    GROUP BY status
  `).bind(r2Key).all();

    const statuses = result.results || [];
    const hasReady = statuses.some((s: any) => s.status === 'ready');
    const hasProcessing = statuses.some((s: any) => s.status === 'processing');
    const hasError = statuses.some((s: any) => s.status === 'error');

    let overallStatus = 'pending';
    if (hasReady && !hasProcessing) overallStatus = 'ready';
    else if (hasProcessing) overallStatus = 'processing';
    else if (hasError) overallStatus = 'error';

    return c.json({
        success: true,
        r2Key,
        status: overallStatus,
        details: statuses
    });
});

/**
 * 预览 PDF（生成签名 URL）
 * GET /api/textbooks/preview/:subject/:grade/:volume
 */
textbooks.get('/preview/:subject/:grade/:volume', async (c) => {
    const { subject, grade, volume } = c.req.param();
    const r2Key = `pep/${subject}/grade${grade}/vol${volume}.pdf`;

    const object = await c.env.TEXTBOOKS.get(r2Key);
    if (!object) {
        return c.json({ error: '教材不存在' }, 404);
    }

    // 返回 PDF 内容
    return new Response(object.body, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${subject}-grade${grade}-vol${volume}.pdf"`
        }
    });
});

export default textbooks;
