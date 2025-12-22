import { Hono } from 'hono'
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

// Get class score distribution for exam
analysis.get('/class/:classId/exam/:examId/distribution', async (c) => {
    const { classId, examId } = distributionParamsSchema.parse(c.req.param())
    const service = new AnalysisService(c.env)
    const result = await service.getScoreDistribution(classId, examId)
    return c.json(result)
})

export default analysis
