import { Hono } from 'hono';
import { Env, LoginRequest, JWTPayload } from '../types';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// 用户登录
auth.post('/login', async (c) => {
  try {
    // 记录请求头
    console.log('Login request headers:', Object.fromEntries(c.req.raw.headers));

    // 更安全地解析请求体
    let requestData: LoginRequest;
    try {
      // 尝试获取原始文本
      const rawBody = await c.req.text();
      console.log('Raw request body:', rawBody);
      console.log('Raw body length:', rawBody.length);

      // 尝试解析为 JSON
      requestData = JSON.parse(rawBody);
      console.log('Parsed request data:', JSON.stringify(requestData));
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return c.json(errorResponse('请求格式错误'), 400);
    }

    const { username, password } = requestData;

    if (!username || !password) {
      return c.json(errorResponse('用户名和密码不能为空'), 400);
    }

    console.log('Attempting login for username:', username);

    // 查询用户
    const user = await c.env.DB.prepare(
      'SELECT id, username, password, role, name FROM users WHERE username = ?'
    ).bind(username).first();

    console.log('User query result:', user ? `Found user: ${user.username}` : 'User not found');

    if (!user) {
      console.log('Login failed: User not found');
      return c.json(errorResponse('用户名或密码错误'), 401);
    }

    // 验证密码
    console.log('Verifying password...');
    const isValid = await verifyPassword(password, user.password as string);
    console.log('Password verification result:', isValid);

    if (!isValid) {
      console.log('Login failed: Invalid password');
      return c.json(errorResponse('用户名或密码错误'), 401);
    }

    // 生成 JWT Token
    const payload: JWTPayload = {
      userId: user.id as number,
      username: user.username as string,
      role: user.role as any,
    };

    // 检查 JWT_SECRET 是否存在
    if (!c.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined!');
      return c.json(errorResponse('服务器配置错误', 'JWT_SECRET 未配置'), 500);
    }

    console.log('Generating JWT token...');
    const token = await generateToken(payload, c.env.JWT_SECRET);
    console.log('Login successful for user:', username);

    return c.json(successResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
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

    return c.json(successResponse(userData));
  } catch (error) {
    return c.json(errorResponse('获取用户信息失败', (error as Error).message), 500);
  }
});

// 用户登出 (客户端删除 token)
auth.post('/logout', authMiddleware, async (c) => {
  return c.json(successResponse(null, '登出成功'));
});

export default auth;