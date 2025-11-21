import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { cacheMiddleware } from './middleware/cache';
import { loggingMiddleware } from './middleware/logging';
import auth from './routes/auth';
import classes from './routes/classes';
import students from './routes/students';
import courses from './routes/courses';
import exams from './routes/exams';
import scores from './routes/scores';
import stats from './routes/stats';
import profile from './routes/stats/profile';
import classTrend from './routes/stats/class-trend';
import reports from './routes/reports';
import importRoute from './routes/import';
import init from './routes/init';
import debug from './routes/debug';
import upload from './routes/upload';
import analysis from './routes/analysis';
import exportRoute from './routes/export';

const app = new Hono<{ Bindings: Env }>();

// CORS 中间件
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 日志中间件
app.use('/api/*', loggingMiddleware);

// 为统计接口添加缓存(5分钟)
app.use('/api/stats/*', cacheMiddleware(300));

// 为报告接口添加缓存(10分钟)
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
app.route('/api/stats/profile', profile);
app.route('/api/stats/class-trend', classTrend);
app.route('/api/analysis', analysis);
app.route('/api/reports', reports);
app.route('/api/import', importRoute);
app.route('/api/upload', upload);
app.route('/api/export', exportRoute);
app.route('/api/init', init);
app.route('/api/debug', debug);

export default app;