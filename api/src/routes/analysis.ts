import { Hono } from 'hono'
import { streamText } from 'hono/streaming'
import { authMiddleware } from '../middleware/auth'
import { Env, JWTPayload } from '../types'
import { AnalysisService } from '../services/analysis.service'
import {
    classIdSchema,
    examIdSchema,
    reportParamsSchema,
    refreshReportSchema,
    distributionParamsSchema
} from '../schemas/analysis.schema'

const analysis = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>()

// Apply auth middleware to all routes
analysis.use('*', authMiddleware)

// Class Focus Group Analysis
analysis.get('/class/focus/:classId', async (c) => {
    const { classId } = classIdSchema.parse(c.req.param())
    const service = new AnalysisService(c.env)
    const result = await service.getClassFocusGroup(classId)
    return c.json(result)
})

// Exam Quality Analysis
analysis.get('/exam/quality/:examId', async (c) => {
    const { examId } = examIdSchema.parse(c.req.param())
    const service = new AnalysisService(c.env)
    const result = await service.getExamQuality(examId)
    return c.json(result)
})

// Get or Generate Class AI Diagnostic Report
analysis.get('/class/report/:classId/:examId', async (c) => {
    const { classId, examId } = reportParamsSchema.parse(c.req.param())
    const service = new AnalysisService(c.env)
    const result = await service.getClassReport(classId, examId)
    return c.json(result)
})

// Refresh AI Diagnostic Report
analysis.post('/class/report/refresh', async (c) => {
    const { classId, examId } = refreshReportSchema.parse(await c.req.json())
    const service = new AnalysisService(c.env)
    const result = await service.getClassReport(classId, examId, true)
    return c.json(result)
})

// Refresh AI Diagnostic Report (Streaming)
analysis.post('/class/report/refresh/stream', async (c) => {
    const { classId, examId } = refreshReportSchema.parse(await c.req.json())
    const service = new AnalysisService(c.env)

    // Get the raw stream from model
    const stream = await service.generateClassReportStream(c, classId, examId)
    if (!stream) {
        return c.json({ error: 'Failed to start stream' }, 500)
    }

    return streamText(c, async (sse) => {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        try {
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;

                    const dataStr = trimmedLine.substring(5).trim();
                    if (dataStr === '[DONE]') break;

                    try {
                        const parsed = JSON.parse(dataStr);
                        const chunk = parsed.choices?.[0]?.delta;
                        if (chunk) {
                            if (chunk.reasoning_content) {
                                await sse.write(JSON.stringify({ thinking: chunk.reasoning_content }) + '\n');
                            }
                            if (chunk.content) {
                                fullContent += chunk.content;
                                await sse.write(JSON.stringify({ content: chunk.content }) + '\n');
                            }
                        }
                    } catch (e) {
                        // Ignore individual parse errors
                    }
                }
            }

            // 流结束后持久化
            if (fullContent) {
                c.executionCtx.waitUntil(service.persistReport(classId, examId, fullContent));
            }
        } finally {
            reader.releaseLock();
        }
    });
})

// Get class score distribution for exam
analysis.get('/class/:classId/exam/:examId/distribution', async (c) => {
    const { classId, examId } = distributionParamsSchema.parse(c.req.param())
    const service = new AnalysisService(c.env)
    const result = await service.getScoreDistribution(classId, examId)
    return c.json(result)
})

export default analysis
