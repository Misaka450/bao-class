import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { cacheMiddleware } from './middleware/cache';
import auth from './routes/auth';
import classes from './routes/classes';
import students from './routes/students';
import courses from './routes/courses';
import exams from './routes/exams';
import scores from './routes/scores';
import stats from './routes/stats';
import reports from './routes/reports';

const app = new Hono<{ Bindings: Env }>();

// CORS 中间件
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 为统计接口添加缓存（5分钟）
app.use('/api/stats/*', cacheMiddleware(300));

// 为报告接口添加缓存（10分钟）
app.use('/api/reports/*', cacheMiddleware(600));

// 健康检查
app.get('/', (c) => {
  return c.text('小学班级成绩管理系统 API 正常运行');
});

// 注册路由
app.route('/api/auth', auth);
app.route('/api/classes', classes);
app.route('/api/students', students);
app.route('/api/courses', courses);
app.route('/api/exams', exams);
app.route('/api/scores', scores);
app.route('/api/stats', stats);
app.route('/api/reports', reports);

export default app;