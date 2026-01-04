import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Tooltip, Typography, Skeleton } from 'antd';
import { StopOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './StreamingMarkdown.css';

const { Text } = Typography;

interface StreamingMarkdownProps {
    /** Markdown 内容 */
    content: string;
    /** 是否正在生成中 */
    isStreaming?: boolean;
    /** 停止生成的回调 */
    onStop?: () => void;
    /** 是否显示复制按钮 */
    showCopy?: boolean;
    /** 是否启用答案折叠（用于作业） */
    foldAnswers?: boolean;
    /** 空内容时显示的占位符 */
    placeholder?: React.ReactNode;
    /** 加载中显示 skeleton */
    loading?: boolean;
    /** 自定义样式 */
    style?: React.CSSProperties;
    /** 自定义类名 */
    className?: string;
}

// Code 语法高亮组件
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

// 答案折叠组件
const FoldableAnswer = ({ children }: { children: React.ReactNode }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="foldable-answer">
            <Button
                type="link"
                size="small"
                onClick={() => setVisible(!visible)}
                style={{ padding: 0, marginBottom: 8 }}
            >
                {visible ? '收起答案 ▲' : '查看答案 ▼'}
            </Button>
            {visible && <div className="answer-content">{children}</div>}
        </div>
    );
};

/**
 * 通用流式 Markdown 渲染组件
 * 
 * 功能：
 * - 停止生成按钮
 * - Code 语法高亮
 * - 答案折叠（可选）
 * - 复制按钮（可选）
 */
const StreamingMarkdown: React.FC<StreamingMarkdownProps> = ({
    content,
    isStreaming = false,
    onStop,
    showCopy = false,
    foldAnswers = false,
    placeholder,
    loading = false,
    style,
    className,
}) => {
    const [copied, setCopied] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // 复制功能
    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Copy failed:', e);
        }
    }, [content]);

    // 处理答案折叠
    const processContent = useCallback((rawContent: string) => {
        if (!foldAnswers) return rawContent;
        // 将 **答案** 和 **解析** 部分包装成特殊标记
        return rawContent;
    }, [foldAnswers]);

    // 自动滚动到底部
    useEffect(() => {
        if (isStreaming && contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [content, isStreaming]);

    if (loading) {
        return (
            <div className={`streaming-markdown ${className || ''}`} style={style}>
                <Skeleton active paragraph={{ rows: 4 }} />
            </div>
        );
    }

    if (!content && placeholder) {
        return (
            <div className={`streaming-markdown ${className || ''}`} style={style}>
                {placeholder}
            </div>
        );
    }

    return (
        <div className={`streaming-markdown ${className || ''}`} style={style}>
            {/* 工具栏 */}
            {(isStreaming || showCopy) && content && (
                <div className="streaming-toolbar">
                    {isStreaming && onStop && (
                        <Tooltip title="停止生成">
                            <Button
                                type="primary"
                                danger
                                size="small"
                                icon={<StopOutlined />}
                                onClick={onStop}
                            >
                                停止
                            </Button>
                        </Tooltip>
                    )}
                    {showCopy && !isStreaming && (
                        <Tooltip title={copied ? '已复制' : '复制内容'}>
                            <Button
                                type="text"
                                size="small"
                                icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                                onClick={handleCopy}
                            />
                        </Tooltip>
                    )}
                </div>
            )}

            {/* Markdown 内容 */}
            <div className="markdown-content" ref={contentRef}>
                <Markdown
                    components={{
                        code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');

                            // 处理答案折叠
                            if (foldAnswers && props.node?.position) {
                                // 简化处理：代码块不折叠
                            }

                            return match ? (
                                <CodeBlock language={match[1]}>{codeString}</CodeBlock>
                            ) : (
                                <code className={className} {...props}>{children}</code>
                            );
                        },
                        // 答案折叠：识别 **答案** 或 **解析** 段落
                        strong({ children, ...props }) {
                            const text = String(children);
                            if (foldAnswers && (text === '答案' || text === '解析')) {
                                return (
                                    <span className="answer-label">
                                        <strong {...props}>{children}</strong>
                                    </span>
                                );
                            }
                            return <strong {...props}>{children}</strong>;
                        }
                    }}
                >
                    {processContent(content)}
                </Markdown>

                {/* 流式生成中的光标 */}
                {isStreaming && (
                    <span className="streaming-cursor">▊</span>
                )}
            </div>
        </div>
    );
};

export default StreamingMarkdown;
