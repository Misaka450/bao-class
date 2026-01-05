import React, { forwardRef, useCallback, useMemo } from 'react';
import { Avatar } from 'antd';
import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import * as ReactWindow from 'react-window';

export interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    time: string;
}

// Code 组件渲染
const CodeBlock = ({ language, children }: { language?: string; children: string }) => (
    <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{ borderRadius: 8, fontSize: 13, margin: '8px 0' }}
    >
        {children}
    </SyntaxHighlighter>
);

// 单条消息渲染组件
export const MessageItem = React.memo(({ message }: { message: Message }) => (
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

// 虚拟列表项高度估算
const ESTIMATED_ROW_HEIGHT = 120;
const VIRTUAL_LIST_THRESHOLD = 50;

interface ChatMessagesProps {
    messages: Message[];
    loading: boolean;
    height: number;
}

// 获取虚拟列表组件
const List = (ReactWindow as any).FixedSizeList || (ReactWindow as any).default?.FixedSizeList;

const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(({
    messages,
    loading,
    height
}, ref) => {
    // 判断是否使用虚拟列表（仅当组件存在且消息超过阈值）
    const useVirtualList = List && messages.length > VIRTUAL_LIST_THRESHOLD;

    // 虚拟列表行渲染
    const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => (
        <div style={style}>
            <MessageItem message={messages[index]} />
        </div>
    ), [messages]);

    // 计算列表高度
    const listHeight = useMemo(() => Math.max(height - 60, 200), [height]);

    return (
        <div
            className="ai-chat-messages"
            ref={ref}
            style={{ flex: 1, overflowY: 'auto', padding: 16 }}
        >
            {useVirtualList ? (
                <List
                    height={listHeight}
                    itemCount={messages.length}
                    itemSize={ESTIMATED_ROW_HEIGHT}
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
    );
});

ChatMessages.displayName = 'ChatMessages';

export default ChatMessages;
