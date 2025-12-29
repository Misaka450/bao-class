import { Hono } from 'hono';
import { Env, LoginRequest, JWTPayload } from '../types';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { getAuthorizedClassIds, getAuthorizedCourseIds } from '../utils/auth';

const auth = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// 用户登录
auth.post('/login', async (c) => {
  try {
    // 解析请求体
    let requestData: LoginRequest;
    try {
      const rawBody = await c.req.text();
      requestData = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return c.json(errorResponse('请求格式错误'), 400);
    }

    const { username, password } = requestData;

    if (!username || !password) {
      return c.json(errorResponse('用户名和密码不能为空'), 400);
    }

    // 查询用户
    const user = await c.env.DB.prepare(
      'SELECT id, username, password, role, name FROM users WHERE username = ?'
    ).bind(username).first();

    if (!user) {
      return c.json(errorResponse('用户名或密码错误'), 401);
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.password as string);

    if (!isValid) {
      return c.json(errorResponse('用户名或密码错误'), 401);
    }

    // 生成 JWT Token
    const payload: JWTPayload = {
      userId: user.id as number,
      username: user.username as string,
      name: user.name as string,
      role: user.role as any,
    };

    // 检查 JWT_SECRET 是否存在
    if (!c.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined!');
      return c.json(errorResponse('服务器配置错误', 'JWT_SECRET 未配置'), 500);
    }

    const token = await generateToken(payload, c.env.JWT_SECRET);

    // 获取授权范围
    const authorizedClassIds = await getAuthorizedClassIds(c.env.DB, payload);
    const authorizedCourseIds = await getAuthorizedCourseIds(c.env.DB, payload);

    return c.json(successResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        authorizedClassIds,
        authorizedCourseIds,
      },
    }));
  } catch (error) {
    console.error('Login error:', error);
    return c.json(errorResponse('登录失败', (error as Error).message), 500);
  }
});

// 获取当前用户信息
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.var.user;

    const userData = await c.env.DB.prepare(
      'SELECT id, username, role, name FROM users WHERE id = ?'
    ).bind(user.userId).first();

    if (!userData) {
      return c.json(errorResponse('用户不存在'), 404);
    }

    // 获取授权范围
    const payload: JWTPayload = {
      userId: userData.id as number,
      username: userData.username as string,
      name: userData.name as string,
      role: userData.role as any,
    };
    const authorizedClassIds = await getAuthorizedClassIds(c.env.DB, payload);
    const authorizedCourseIds = await getAuthorizedCourseIds(c.env.DB, payload);

    return c.json(successResponse({
      ...userData,
      authorizedClassIds,
      authorizedCourseIds,
    }));
  } catch (error) {
    return c.json(errorResponse('获取用户信息失败', (error as Error).message), 500);
  }
});

// 用户登出 (客户端删除 token)
auth.post('/logout', authMiddleware, async (c) => {
  return c.json(successResponse(null, '登出成功'));
});

export default auth;