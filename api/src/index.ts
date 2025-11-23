import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { cacheMiddleware } from './middleware/cache';
import { loggingMiddleware } from './middleware/logging';
import { errorHandler } from './middleware/error-handler';
import { rateLimiter } from './middleware/rate-limiter';
import { authMiddleware } from './middleware/auth';
import auth from './routes/auth';
import classes from './routes/classes';
import students from './routes/students';
import courses from './routes/courses';
import exams from './routes/exams';
import scores from './routes/scores';
import stats from './routes/stats';
import profile from './routes/stats/profile';
import classTrend from './routes/stats/class-trend';
import classSubjectTrend from './routes/stats/class-subject-trend';
import gradeComparison from './routes/stats/grade-comparison';
import reports from './routes/reports';
import importRoute from './routes/import';
import init from './routes/init';
import debug from './routes/debug';
import upload from './routes/upload';
import analysis from './routes/analysis';
import exportRoute from './routes/export';
import logs from './routes/logs';

const app = new Hono<{ Bindings: Env }>();

// CORS 中间件 - 根据环境动态配置
app.use('/*', cors({
  origin: (origin) => {
    // 简化的环境判断
    const isDev = origin?.includes('localhost') || origin?.includes('127.0.0.1');
    if (isDev) return origin;

    // 生产环境只允许特定域名
    const allowedOrigins = [
      'https://bao-class.pages.dev',
      'https://980823.xyz',
      'https://www.980823.xyz'
    ];
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 速率限制中间件 - 防止API滥用
app.use('/api/*', rateLimiter(15 * 60 * 1000, 1000)); // 15分钟1000次请求

// 日志中间件
app.use('/api/*', loggingMiddleware);

// 为统计接口添加缓存(5分钟)
app.use('/api/stats/*', cacheMiddleware(300));

// 为报告接口添加缓存(10分钟)
app.use('/api/reports/*', cacheMiddleware(600));

// 健康检查
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: '小学班级成绩管理系统 API',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT || 'production'
  });
});

// 注册路由 (除了 auth 和 init,其他路由都需要认证)
app.route('/api/auth', auth);
app.route('/api/init', init);

// 需要认证的路由
app.use('/api/classes/*', authMiddleware);
app.route('/api/classes', classes);

app.use('/api/students/*', authMiddleware);
app.route('/api/students', students);

app.use('/api/courses/*', authMiddleware);
app.route('/api/courses', courses);

app.use('/api/exams/*', authMiddleware);
app.route('/api/exams', exams);

app.use('/api/scores/*', authMiddleware);
app.route('/api/scores', scores);

app.use('/api/stats/*', authMiddleware);
app.route('/api/stats', stats);
app.route('/api/stats/profile', profile);
app.route('/api/stats/class-trend', classTrend);
app.route('/api/stats/class-subject-trend', classSubjectTrend);
app.route('/api/stats/grade-comparison', gradeComparison);

app.use('/api/analysis/*', authMiddleware);
app.route('/api/analysis', analysis);

app.use('/api/reports/*', authMiddleware);
app.route('/api/reports', reports);

app.use('/api/import/*', authMiddleware);
app.route('/api/import', importRoute);

app.use('/api/upload/*', authMiddleware);
app.route('/api/upload', upload);

app.use('/api/export/*', authMiddleware);
app.route('/api/export', exportRoute);

app.use('/api/logs/*', authMiddleware);
app.route('/api/logs', logs);

app.route('/api/debug', debug);

// 全局错误处理
app.onError(errorHandler);

export default app;