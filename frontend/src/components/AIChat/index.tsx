import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, Badge, Segmented, Tooltip, Popover, Button } from 'antd';
import { MessageOutlined, SearchOutlined, BookOutlined } from '@ant-design/icons';
import { aiApi } from '../../services/api';
import { useResponsive } from '../../hooks/useResponsive';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import ChatMessages, { Message } from './ChatMessages';
import './style.css';

interface ChatHistoryItem {
    role: string;
    content: string;
}

type ChatMode = 'query' | 'knowledge';

// 生成唯一ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const AIChat: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [mode, setMode] = useState<ChatMode>('query');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 350, height: 500 });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState<string>('');
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [startDim, setStartDim] = useState({ width: 0, height: 0 });
    const [messages, setMessages] = useState<Message[]>([
        { id: generateId(), role: 'ai', content: '您好！我是您的 AI 助教。\n\n- 数据查询模式：可以查询班级成绩、学生情况等数据\n- 知识对话模式：可以咨询教学知识、班级管理经验等\n\n请选择对话模式开始使用。', time: new Date().toLocaleTimeString() }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
    const chatCardRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<(() => void) | null>(null);
    const responsive = useResponsive();

    // 自动滚动到底部
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // 鼠标/触摸调整大小
    const handleMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        setStartPos({ x: e.clientX, y: e.clientY });
        setStartDim({ width: dimensions.width, height: dimensions.height });
    }, [dimensions]);

    const handleTouchStart = useCallback((e: React.TouchEvent, direction: string) => {
        e.stopPropagation();
        const touch = e.touches[0];
        setIsResizing(true);
        setResizeDirection(direction);
        setStartPos({ x: touch.clientX, y: touch.clientY });
        setStartDim({ width: dimensions.width, height: dimensions.height });
    }, [dimensions]);

    useEffect(() => {
        const handleResize = (clientX: number, clientY: number) => {
            const dx = clientX - startPos.x;
            const dy = clientY - startPos.y;

            if (resizeDirection.includes('e')) {
                setDimensions(prev => ({ ...prev, width: Math.max(300, Math.min(800, startDim.width + dx)) }));
            }
            if (resizeDirection.includes('s')) {
                setDimensions(prev => ({ ...prev, height: Math.max(300, Math.min(700, startDim.height + dy)) }));
            }
            if (resizeDirection.includes('w')) {
                setDimensions(prev => ({ ...prev, width: Math.max(300, Math.min(800, startDim.width - dx)) }));
            }
            if (resizeDirection.includes('n')) {
                setDimensions(prev => ({ ...prev, height: Math.max(300, Math.min(700, startDim.height - dy)) }));
            }
        };

        const handleMouseMove = (e: MouseEvent) => isResizing && handleResize(e.clientX, e.clientY);
        const handleTouchMove = (e: TouchEvent) => isResizing && handleResize(e.touches[0].clientX, e.touches[0].clientY);
        const handleEnd = () => { setIsResizing(false); setResizeDirection(''); };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isResizing, resizeDirection, startPos, startDim]);

    const toggleFullscreen = useCallback(() => {
        if (isFullscreen) setDimensions({ width: 350, height: 500 });
        setIsFullscreen(prev => !prev);
    }, [isFullscreen]);

    const handleStop = useCallback(() => {
        if (abortRef.current) {
            abortRef.current();
            abortRef.current = null;
            setLoading(false);
        }
    }, []);

    const handleSend = useCallback(async () => {
        if (!inputValue.trim() || loading) return;

        const userMsg: Message = {
            id: generateId(),
            role: 'user',
            content: inputValue,
            time: new Date().toLocaleTimeString()
        };

        const aiMsgId = generateId();
        setMessages(prev => [...prev, userMsg, { id: aiMsgId, role: 'ai', content: '', time: new Date().toLocaleTimeString() }]);
        setInputValue('');
        setLoading(true);

        let fullContent = '';

        try {
            const newHistory = [...chatHistory, { role: 'user', content: inputValue }];
            const onChunk = (chunk: string) => {
                fullContent += chunk;
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.role === 'ai') {
                        return [...prev.slice(0, -1), { ...last, content: fullContent }];
                    }
                    return prev;
                });
            };

            const streamResult = mode === 'query'
                ? aiApi.chatQueryStream(inputValue, { onChunk })
                : aiApi.chatKnowledgeStream(inputValue, newHistory, { onChunk });

            abortRef.current = streamResult.abort;
            await streamResult.promise;
            setChatHistory([...newHistory, { role: 'assistant', content: fullContent }]);
        } catch (error: any) {
            if (error?.name === 'AbortError') return;
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'ai' && !last.content) {
                    return [...prev.slice(0, -1), { ...last, content: '抱歉，我现在无法处理您的请求，请稍后再试。' }];
                }
                return prev;
            });
        } finally {
            setLoading(false);
            abortRef.current = null;
            window.dispatchEvent(new CustomEvent('ai-usage-update'));
        }
    }, [inputValue, loading, mode, chatHistory]);

    const handleModeChange = useCallback((value: string) => {
        const newMode = value as ChatMode;
        setMode(newMode);
        setChatHistory([]);
        setMessages([{
            id: generateId(),
            role: 'ai',
            content: newMode === 'query'
                ? '已切换到数据查询模式。您可以问我关于班级成绩、学生情况的任何问题，例如："三年级一班的数学平均分是多少？"\n\n注意：系统会根据您上传的数据进行智能分析。'
                : '已切换到知识对话模式。您可以向我咨询教学、班级管理、学生教育等方面的知识和经验，例如："如何帮助学生提高阅读理解能力？"',
            time: new Date().toLocaleTimeString()
        }]);
    }, []);

    const cardStyle: React.CSSProperties = isFullscreen
        ? { width: '100%', height: '100%', borderRadius: 0 }
        : { width: dimensions.width, height: dimensions.height };

    const messageAreaHeight = useMemo(() => {
        if (isFullscreen) {
            return typeof window !== 'undefined' ? window.innerHeight * 0.8 - 180 : 400;
        }
        return dimensions.height - 180;
    }, [isFullscreen, dimensions.height]);

    const content = (
        <div
            className={`ai-chat-container ${isFullscreen ? 'fullscreen' : ''} ${isResizing ? 'resizing' : ''}`}
            ref={chatCardRef}
            style={cardStyle}
        >
            {!isFullscreen && (
                <>
                    <div className="resize-handle resize-handle-e" onMouseDown={(e) => handleMouseDown(e, 'e')} onTouchStart={(e) => handleTouchStart(e, 'e')} />
                    <div className="resize-handle resize-handle-s" onMouseDown={(e) => handleMouseDown(e, 's')} onTouchStart={(e) => handleTouchStart(e, 's')} />
                    <div className="resize-handle resize-handle-se" onMouseDown={(e) => handleMouseDown(e, 'se')} onTouchStart={(e) => handleTouchStart(e, 'se')} />
                </>
            )}
            <Card
                className={`ai-chat-card ${responsive.isMobile ? 'mobile' : ''}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                styles={{ body: { padding: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' } }}
            >
                <ChatHeader
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={toggleFullscreen}
                    onClose={() => setVisible(false)}
                />
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #efefef', flexShrink: 0 }}>
                    <Segmented
                        options={[
                            { label: <Tooltip title="查询班级成绩、学生数据"><span><SearchOutlined /> 数据查询</span></Tooltip>, value: 'query' },
                            { label: <Tooltip title="咨询教学知识、班级管理经验"><span><BookOutlined /> 知识对话</span></Tooltip>, value: 'knowledge' }
                        ]}
                        value={mode}
                        onChange={handleModeChange}
                        size="small"
                        style={{ width: '100%' }}
                    />
                </div>
                <ChatMessages
                    ref={scrollRef}
                    messages={messages}
                    loading={loading}
                    height={messageAreaHeight}
                />
                <ChatInput
                    mode={mode}
                    value={inputValue}
                    loading={loading}
                    onChange={setInputValue}
                    onSend={handleSend}
                    onStop={handleStop}
                />
            </Card>
        </div>
    );

    return (
        <div className="ai-chat-widget">
            <Popover
                content={content}
                trigger="click"
                open={visible}
                onOpenChange={visible => setVisible(visible)}
                placement="topLeft"
                overlayClassName="ai-chat-popover"
                getPopupContainer={() => document.body}
            >
                <Badge dot={messages.length > 20}>
                    <Button
                        type="primary"
                        shape="circle"
                        icon={<MessageOutlined />}
                        size="large"
                        className="ai-chat-btn"
                    />
                </Badge>
            </Popover>
        </div>
    );
};

export default AIChat;

