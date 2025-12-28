import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, List, Avatar, Card, Space, Popover, Badge } from 'antd';
import { MessageOutlined, SendOutlined, RobotOutlined, UserOutlined, CloseOutlined } from '@ant-design/icons';
import { aiApi } from '../../services/api';
import { useResponsive } from '../../hooks/useResponsive';
import './style.css';

interface Message {
    role: 'user' | 'ai';
    content: string;
    time: string;
}

const AIChat: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: '您好！我是您的 AI 助教。您可以问我关于班级成绩、学生情况的任何问题，例如：“张三最近的数学成绩怎么样？”', time: new Date().toLocaleTimeString() }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const responsive = useResponsive();

    // 自动滚动到底部
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

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

        // 添加一个空的 AI 消息占位
        setMessages(prev => [...prev, {
            role: 'ai',
            content: '',
            time: new Date().toLocaleTimeString()
        }]);

        let fullContent = '';

        try {
            await aiApi.chatQueryStream(userMsg.content, {
                onChunk: (chunk) => {
                    fullContent += chunk;
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'ai') {
                            return [
                                ...prev.slice(0, -1),
                                { ...last, content: fullContent }
                            ];
                        }
                        return prev;
                    });
                }
            });
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: '抱歉，我现在无法处理您的请求，请稍后再试。',
                time: new Date().toLocaleTimeString()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <Card
            className={`ai-chat-card ${responsive.isMobile ? 'mobile' : ''}`}
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><RobotOutlined /> AI 助教</span>
                    <Button type="text" icon={<CloseOutlined />} onClick={() => setVisible(false)} />
                </div>
            }
            styles={{ body: { padding: 0 } }}
        >
            <div className="ai-chat-messages" ref={scrollRef}>
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
            <div className="ai-chat-input">
                <Input
                    placeholder="输入您的疑问..."
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
