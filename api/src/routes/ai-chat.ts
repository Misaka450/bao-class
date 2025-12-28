import { Hono } from 'hono';
import { Env, JWTPayload } from '../types';
import { authMiddleware } from '../middleware/auth';
import { AIChatService } from '../services/ai-chat.service';

const aiChat = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// 应用认证中间件
aiChat.use('*', authMiddleware);

/**
 * AI 助教对话查询
 * POST /api/ai/chat/query
 */
aiChat.post('/query', async (c) => {
    const { query } = await c.req.json();
    if (!query) return c.json({ error: 'Query is required' }, 400);

    const user = c.get('user');
    const aiChatService = new AIChatService(c.env);

    try {
        const answer = await aiChatService.chat(query, user.userId, user.role);
        return c.json({
            success: true,
            data: {
                answer
            }
        });
    } catch (error: any) {
        return c.json({
            success: false,
            error: error.message
        }, error.statusCode || 500);
    }
});

export default aiChat;
