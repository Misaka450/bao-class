import { Hono } from 'hono';
import { Env, LoginRequest, JWTPayload } from '../types';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
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