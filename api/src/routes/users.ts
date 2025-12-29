import { Hono } from 'hono';
import { Env, JWTPayload } from '../types';
import { authMiddleware, checkRole } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { hashPassword } from '../utils/crypto';

const users = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// 所有接口都需要管理员权限
users.use('/*', authMiddleware);
users.use('/*', checkRole(['admin']));

// 获取用户列表
users.get('/', async (c) => {
    try {
        const { results } = await c.env.DB.prepare(`
      SELECT u.id, u.username, u.role, u.name, u.created_at,
             (SELECT group_concat(c.name) FROM classes c WHERE c.teacher_id = u.id) as assigned_classes
      FROM users u
      ORDER BY u.created_at DESC
    `).all();

        return c.json(successResponse(results));
    } catch (error) {
        return c.json(errorResponse('获取用户列表失败', (error as Error).message), 500);
    }
});

// 创建用户
users.post('/', async (c) => {
    try {
        const body = await c.req.json();
        const { username, password, role, name } = body;

        if (!username || !password || !role || !name) {
            return c.json(errorResponse('必填项不能为空'), 400);
        }

        // 检查用户名是否已存在
        const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
        if (existing) {
            return c.json(errorResponse('用户名已存在'), 400);
        }

        const hashedPassword = await hashPassword(password);
        const { success } = await c.env.DB.prepare(
            'INSERT INTO users (username, password, role, name, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(username, hashedPassword, role, name, new Date().toISOString()).run();

        if (success) {
            return c.json(successResponse(null, '创建用户成功'));
        }
        return c.json(errorResponse('创建用户失败'), 500);
    } catch (error) {
        return c.json(errorResponse('创建用户失败', (error as Error).message), 500);
    }
});

// 更新用户
users.put('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { role, name, password } = body;

        let query = 'UPDATE users SET role = ?, name = ?';
        const params: any[] = [role, name];

        if (password) {
            const hashedPassword = await hashPassword(password);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(id);

        const { success } = await c.env.DB.prepare(query).bind(...params).run();

        if (success) {
            return c.json(successResponse(null, '更新成功'));
        }
        return c.json(errorResponse('更新失败'), 500);
    } catch (error) {
        return c.json(errorResponse('更新失败', (error as Error).message), 500);
    }
});

// 删除用户
users.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');

        // 不允许删除自己
        if (Number(id) === c.var.user.userId) {
            return c.json(errorResponse('不能删除当前登录账号'), 400);
        }

        const { success } = await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

        if (success) {
            return c.json(successResponse(null, '删除成功'));
        }
        return c.json(errorResponse('删除失败'), 500);
    } catch (error) {
        return c.json(errorResponse('删除失败', (error as Error).message), 500);
    }
});

export default users;
