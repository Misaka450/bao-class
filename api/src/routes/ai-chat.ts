import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { Env, JWTPayload } from '../types';
import { authMiddleware } from '../middleware/auth';
import { AIChatService } from '../services/ai-chat.service';

const aiChat = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// 应用认证中间件
aiChat.use('*', authMiddleware);

/**
 * AI 助教对话查询 (流式)
 * POST /api/ai/chat/query/stream
 */
aiChat.post('/query/stream', async (c) => {
    const { query } = await c.req.json();
    if (!query) return c.json({ error: 'Query is required' }, 400);

    const aiChatService = new AIChatService(c.env);

    try {
        const response = await aiChatService.chatStream(query);
        if (!response.body) throw new Error('Failed to start stream');

        return streamText(c, async (sse) => {
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;

                        const dataStr = trimmedLine.substring(5).trim();
                        if (dataStr === '[DONE]') break;

                        try {
                            const parsed = JSON.parse(dataStr);
                            const chunk = parsed.choices?.[0]?.delta?.content;
                            if (chunk) {
                                await sse.write(`data: ${JSON.stringify({ content: chunk })}\n`);
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
                await sse.write('data: [DONE]\n');
            } finally {
                reader.releaseLock();
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
