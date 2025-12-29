import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { cacheMiddleware } from './middleware/cache';
import { loggingMiddleware } from './middleware/logging';
import { errorHandler } from './middleware/error-handler';
import { rateLimiter } from './middleware/rate-limiter';
import auth from './routes/auth';
import classes from './routes/classes';
import students from './routes/students';
import courses from './routes/courses';
import exams from './routes/exams';
import scores from './routes/scores';
import stats from './routes/stats';
import importRoute from './routes/import';
import init from './routes/init';
import upload from './routes/upload';
import analysis from './routes/analysis';
import exportRoute from './routes/export';
import logs from './routes/logs';
import ai from './routes/ai';
import users from './routes/users';
import lessonPrep from './routes/lesson-prep';
import aiChat from './routes/ai-chat';

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

// 速率限制中间件 - 防止API滥用 (调整为 1分钟 1000次，提高容错性)
app.use('/api/*', rateLimiter(1 * 60 * 1000, 1000));

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

// 注册路由
app.route('/api/auth', auth);
app.route('/api/classes', classes);
app.route('/api/students', students);
app.route('/api/courses', courses);
app.route('/api/exams', exams);
app.route('/api/scores', scores);
app.route('/api/stats', stats);
app.route('/api/analysis', analysis);

app.route('/api/import', importRoute);
app.route('/api/upload', upload);
app.route('/api/export', exportRoute);
app.route('/api/logs', logs);
app.route('/api/ai', ai);
app.route('/api/users', users);
app.route('/api/lesson-prep', lessonPrep);
app.route('/api/ai/chat', aiChat);
app.route('/api/init', init);

// 全局错误处理
app.onError(errorHandler);

export default app;