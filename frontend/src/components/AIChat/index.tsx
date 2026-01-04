import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button, Input, Avatar, Card, Badge, Segmented, Tooltip, Popover } from 'antd';
import { MessageOutlined, SendOutlined, RobotOutlined, UserOutlined, CloseOutlined, SearchOutlined, BookOutlined, FullscreenOutlined, FullscreenExitOutlined, StopOutlined } from '@ant-design/icons';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FixedSizeList as List } from 'react-window';
import { aiApi } from '../../services/api';
import { useResponsive } from '../../hooks/useResponsive';
import './style.css';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    time: string;
}

interface ChatHistoryItem {
    role: string;
    content: string;
}

type ChatMode = 'query' | 'knowledge';

// 生成唯一ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Code 组件渲染
const CodeBlock = ({ language, children }: { language?: string; children: string }) => {
    return (
        <SyntaxHighlighter
            style={oneDark}
            language={language || 'text'}
            PreTag="div"
            customStyle={{ borderRadius: 8, fontSize: 13, margin: '8px 0' }}
        >
            {children}
        </SyntaxHighlighter>
    );
};

// 单条消息渲染组件
const MessageItem = React.memo(({ message }: { message: Message }) => (
    <div className={`message-item ${message.role}`}>
        <Avatar icon={message.role === 'ai' ? <RobotOutlined /> : <UserOutlined />} />
        <div className="message-content">
            <div className="message-text">
                {message.role === 'ai' ? (
                    <Markdown
                        components={{
                            code({ className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                const codeString = String(children).replace(/\n$/, '');
                                return match ? (
                                    <CodeBlock language={match[1]}>{codeString}</CodeBlock>
                                ) : (
                                    <code className={className} {...props}>{children}</code>
                                );
                            }
                        }}
                    >
                        {message.content}
                    </Markdown>
                ) : (
                    message.content
                )}
            </div>
            <div className="message-time">{message.time}</div>
        </div>
    </div>
));

MessageItem.displayName = 'MessageItem';

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

    // 鼠标调整大小
    const handleMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        setStartPos({ x: e.clientX, y: e.clientY });
        setStartDim({ width: dimensions.width, height: dimensions.height });
    }, [dimensions]);

    // 触摸调整大小（移动端支持）
    const handleTouchStart = useCallback((e: React.TouchEvent, direction: string) => {
        e.stopPropagation();
        const touch = e.touches[0];
        setIsResizing(true);
        setResizeDirection(direction);
        setStartPos({ x: touch.clientX, y: touch.clientY });
        setStartDim({ width: dimensions.width, height: dimensions.height });
    }, [dimensions]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            handleResize(e.clientX, e.clientY);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isResizing) return;
            const touch = e.touches[0];
            handleResize(touch.clientX, touch.clientY);
        };

        const handleResize = (clientX: number, clientY: number) => {
            const dx = clientX - startPos.x;
            const dy = clientY - startPos.y;

            if (resizeDirection.includes('e')) {
                setDimensions(prev => ({
                    ...prev,
                    width: Math.max(300, Math.min(800, startDim.width + dx))
                }));
            }
            if (resizeDirection.includes('s')) {
                setDimensions(prev => ({
                    ...prev,
                    height: Math.max(300, Math.min(700, startDim.height + dy))
                }));
            }
            if (resizeDirection.includes('w')) {
                setDimensions(prev => ({
                    ...prev,
                    width: Math.max(300, Math.min(800, startDim.width - dx))
                }));
            }
            if (resizeDirection.includes('n')) {
                setDimensions(prev => ({
                    ...prev,
                    height: Math.max(300, Math.min(700, startDim.height - dy))
                }));
            }
        };

        const handleEnd = () => {
            setIsResizing(false);
            setResizeDirection('');
        };

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

    const toggleFullscreen = () => {
        if (isFullscreen) {
            setDimensions({ width: 350, height: 500 });
        }
        setIsFullscreen(!isFullscreen);
    };

    // 停止生成
    const handleStop = useCallback(() => {
        if (abortRef.current) {
            abortRef.current();
            abortRef.current = null;
            setLoading(false);
        }
    }, []);

    const handleSend = async () => {
        if (!inputValue.trim() || loading) return;

        const userMsg: Message = {
            id: generateId(),
            role: 'user',
            content: inputValue,
            time: new Date().toLocaleTimeString()
        };

        const aiMsgId = generateId();
        setMessages(prev => [...prev, userMsg, {
            id: aiMsgId,
            role: 'ai',
            content: '',
            time: new Date().toLocaleTimeString()
        }]);
        setInputValue('');
        setLoading(true);

        let fullContent = '';

        try {
            const newHistory = [...chatHistory, { role: 'user', content: inputValue }];
            let streamResult: { promise: Promise<void>; abort: () => void };

            if (mode === 'query') {
                streamResult = aiApi.chatQueryStream(inputValue, {
                    onChunk: (chunk) => {
                        fullContent += chunk;
                        setMessages(prev => {
                            const last = prev[prev.length - 1];
                            if (last && last.role === 'ai') {
                                return [...prev.slice(0, -1), { ...last, content: fullContent }];
                            }
                            return prev;
                        });
                    }
                });
            } else {
                // 知识模式：传递完整对话历史
                streamResult = aiApi.chatKnowledgeStream(inputValue, newHistory, {
                    onChunk: (chunk) => {
                        fullContent += chunk;
                        setMessages(prev => {
                            const last = prev[prev.length - 1];
                            if (last && last.role === 'ai') {
                                return [...prev.slice(0, -1), { ...last, content: fullContent }];
                            }
                            return prev;
                        });
                    }
                });
            }

            // 保存 abort 函数
            abortRef.current = streamResult.abort;
            await streamResult.promise;

            setChatHistory([...newHistory, { role: 'assistant', content: fullContent }]);
        } catch (error: any) {
            // 如果是用户主动中断，不显示错误
            if (error?.name === 'AbortError') {
                return;
            }
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'ai' && !last.content) {
                    return [...prev.slice(0, -1), { ...last, content: '抱歉，我现在无法处理您的请求，请稍后再试。' }];
                }
                return prev;
            });
        } finally {
            setLoading(false);
            abortRef.current = null;
            window.dispatchEvent(new CustomEvent('ai-usage-update'));
        }
    };

    const handleModeChange = (value: string) => {
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
    };

    const cardStyle: React.CSSProperties = isFullscreen
        ? {
            width: '100%',
            height: '100%',
            borderRadius: 0
        }
        : {
            width: dimensions.width,
            height: dimensions.height
        };

    // 虚拟列表行渲染
    const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => (
        <div style={style}>
            <MessageItem message={messages[index]} />
        </div>
    ), [messages]);

    // 消息区域高度计算
    const messageAreaHeight = useMemo(() => {
        if (isFullscreen) {
            return typeof window !== 'undefined' ? window.innerHeight * 0.8 - 180 : 400;
        }
        return dimensions.height - 180;
    }, [isFullscreen, dimensions.height]);

    // 判断是否使用虚拟列表（消息超过 50 条时启用）
    const useVirtualList = messages.length > 50;

    const content = (
        <div
            className={`ai-chat-container ${isFullscreen ? 'fullscreen' : ''} ${isResizing ? 'resizing' : ''}`}
            ref={chatCardRef}
            style={cardStyle}
        >
            {!isFullscreen && (
                <>
                    <div
                        className="resize-handle resize-handle-e"
                        onMouseDown={(e) => handleMouseDown(e, 'e')}
                        onTouchStart={(e) => handleTouchStart(e, 'e')}
                    />
                    <div
                        className="resize-handle resize-handle-s"
                        onMouseDown={(e) => handleMouseDown(e, 's')}
                        onTouchStart={(e) => handleTouchStart(e, 's')}
                    />
                    <div
                        className="resize-handle resize-handle-se"
                        onMouseDown={(e) => handleMouseDown(e, 'se')}
                        onTouchStart={(e) => handleTouchStart(e, 'se')}
                    />
                </>
            )}
            <Card
                className={`ai-chat-card ${responsive.isMobile ? 'mobile' : ''}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                styles={{ body: { padding: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' } }}
            >
                <div className="ai-chat-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid #efefef',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RobotOutlined />
                        <span>AI 助教</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Tooltip title={isFullscreen ? '退出全屏' : '全屏显示'}>
                            <Button
                                type="text"
                                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                                onClick={toggleFullscreen}
                                size="small"
                            />
                        </Tooltip>
                        <Tooltip title="关闭">
                            <Button
                                type="text"
                                icon={<CloseOutlined />}
                                onClick={() => setVisible(false)}
                                size="small"
                            />
                        </Tooltip>
                    </div>
                </div>
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
                <div className="ai-chat-messages" ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                    {useVirtualList ? (
                        <List
                            height={messageAreaHeight}
                            itemCount={messages.length}
                            itemSize={100}
                            width="100%"
                        >
                            {Row}
                        </List>
                    ) : (
                        messages.map((item) => (
                            <MessageItem key={item.id} message={item} />
                        ))
                    )}
                    {loading && (
                        <div className="message-item ai">
                            <Avatar icon={<RobotOutlined />} />
                            <div className="message-content">
                                <div className="message-text loading-dots">正在思考</div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="ai-chat-input" style={{
                    padding: 16,
                    borderTop: '1px solid #efefef',
                    flexShrink: 0
                }}>
                    <Input
                        placeholder={mode === 'query' ? '输入查询指令，如"三年级一班的数学成绩"...' : '输入教学问题，如"如何培养学生的学习兴趣"...'}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onPressEnter={handleSend}
                        suffix={
                            loading ? (
                                <Tooltip title="停止生成">
                                    <Button
                                        type="primary"
                                        danger
                                        icon={<StopOutlined />}
                                        onClick={handleStop}
                                        size="small"
                                    />
                                </Tooltip>
                            ) : (
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    onClick={handleSend}
                                    size="small"
                                />
                            )
                        }
                    />
                </div>
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
