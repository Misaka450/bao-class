import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Input, List, Avatar, Card, Badge, Segmented, Tooltip } from 'antd';
import { MessageOutlined, SendOutlined, RobotOutlined, UserOutlined, CloseOutlined, SearchOutlined, BookOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { aiApi } from '../../services/api';
import { useResponsive } from '../../hooks/useResponsive';
import './style.css';

interface Message {
    role: 'user' | 'ai';
    content: string;
    time: string;
}

interface ChatHistoryItem {
    role: string;
    content: string;
}

type ChatMode = 'query' | 'knowledge';

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
        { role: 'ai', content: '您好！我是您的 AI 助教。\n\n- 数据查询模式：可以查询班级成绩、学生情况等数据\n- 知识对话模式：可以咨询教学知识、班级管理经验等\n\n请选择对话模式开始使用。', time: new Date().toLocaleTimeString() }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
    const chatCardRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const responsive = useResponsive();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        setStartPos({ x: e.clientX, y: e.clientY });
        setStartDim({ width: dimensions.width, height: dimensions.height });
    }, [dimensions]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const dx = e.clientX - startPos.x;
            const dy = e.clientY - startPos.y;

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
                    width: Math.max(300, Math.min(800, startDim.width - dx)
                }));
            }
            if (resizeDirection.includes('n')) {
                setDimensions(prev => ({
                    ...prev,
                    height: Math.max(300, Math.min(700, startDim.height - dy)
                }));
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setResizeDirection('');
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, resizeDirection, startPos, startDim]);

    const toggleFullscreen = () => {
        if (isFullscreen) {
            setDimensions({ width: 350, height: 500 });
        }
        setIsFullscreen(!isFullscreen);
    };

    const handleSend = async () => {
        if (!inputValue.trim() || loading) return;

        const userMsg: Message = {
            role: 'user',
            content: inputValue,
            time: new Date().toLocaleTimeString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setLoading(true);

        setMessages(prev => [...prev, {
            role: 'ai',
            content: '',
            time: new Date().toLocaleTimeString()
        }]);

        let fullContent = '';

        try {
            const newHistory = [...chatHistory, { role: 'user', content: inputValue }];

            if (mode === 'query') {
                await aiApi.chatQueryStream(inputValue, {
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
                setChatHistory([...newHistory, { role: 'assistant', content: fullContent }]);
            } else {
                await aiApi.chatKnowledgeStream(inputValue, {
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
                setChatHistory([...newHistory, { role: 'assistant', content: fullContent }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: '抱歉，我现在无法处理您的请求，请稍后再试。',
                time: new Date().toLocaleTimeString()
            }]);
        } finally {
            setLoading(false);
            window.dispatchEvent(new CustomEvent('ai-usage-update'));
        }
    };

    const handleModeChange = (value: string) => {
        const newMode = value as ChatMode;
        setMode(newMode);
        setChatHistory([]);
        setMessages([{
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

    const content = (
        <div
            className={`ai-chat-container ${isFullscreen ? 'fullscreen' : ''} ${isResizing ? 'resizing' : ''}`}
            ref={chatCardRef}
            style={cardStyle}
        >
            {!isFullscreen && (
                <>
                    <div className="resize-handle resize-handle-e" onMouseDown={(e) => handleMouseDown(e, 'e')} />
                    <div className="resize-handle resize-handle-s" onMouseDown={(e) => handleMouseDown(e, 's')} />
                    <div className="resize-handle resize-handle-se" onMouseDown={(e) => handleMouseDown(e, 'se')} />
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
                    <List
                        itemLayout="horizontal"
                        dataSource={messages}
                        renderItem={(item) => (
                            <div className={`message-item ${item.role}`}>
                                <Avatar icon={item.role === 'ai' ? <RobotOutlined /> : <UserOutlined />} />
                                <div className="message-content">
                                    <div className="message-text">{item.content}</div>
                                    <div className="message-time">{item.time}</div>
                                </div>
                            </div>
                        )}
                    />
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
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handleSend}
                                loading={loading}
                                size="small"
                            />
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
