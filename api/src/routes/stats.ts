import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import profile from './stats/profile'
import classStats from './stats/class'
import examStats from './stats/exam'
import comparison from './stats/comparison'
import scoresList from './stats/scores-list'
import gradeComparison from './stats/grade-comparison'
import classTrend from './stats/class-trend'
import classSubjectTrend from './stats/class-subject-trend'

type Bindings = {
    DB: D1Database
}

const stats = new Hono<{ Bindings: Bindings }>()

// Apply auth middleware to all routes
stats.use('*', authMiddleware)

// Mount sub-routers
stats.route('/profile', profile)
stats.route('/class', classStats)
stats.route('/exam', examStats)
stats.route('/comparison', comparison)
stats.route('/scores-list', scoresList)
stats.route('/grade-comparison', gradeComparison)
stats.route('/class-trend', classTrend)
stats.route('/class-subject-trend', classSubjectTrend)

/**
 * Legacy path support (if needed)
 * Most specific paths are already covered by routers above.
 * e.g. /api/stats/class/:classId is handled by classStats
 *      /api/stats/exam/:examId/distribution is handled by examStats
 */

export default stats
