import React, { useState, useMemo } from 'react';
import { Card, Button, Typography, Skeleton, Empty, Space, message, Alert, Collapse, Anchor, Dropdown, Divider, Affix } from 'antd';
import { RobotOutlined, ReloadOutlined, BulbOutlined, DownloadOutlined, MenuOutlined, CopyOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisApi } from '../services/api';
import ReactMarkdown from 'react-markdown';

const { Title, Text } = Typography;

interface Props {
    classId: number;
    examId: number;
    focusGroupData?: any; // 前端缓存的预警数据，避免后端重复查询
}

interface TocItem {
    key: string;
    title: string;
    level: number;
}

/**
 * 从 Markdown 内容中提取目录结构
 */
function extractToc(markdown: string): TocItem[] {
    if (!markdown) return [];
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const toc: TocItem[] = [];
    let match;
    let index = 0;
    while ((match = headingRegex.exec(markdown)) !== null) {
        const level = match[1].length;
        const title = match[2].trim();
        const key = `section-${index++}`;
        toc.push({ key, title, level });
    }
    return toc;
}

/**
 * 为 Markdown 标题添加锚点 ID
 */
function addAnchors(markdown: string, toc: TocItem[]): string {
    if (!markdown || toc.length === 0) return markdown;
    let result = markdown;
    let tocIndex = 0;
    result = result.replace(/^(#{1,3})\s+(.+)$/gm, (match, hashes, title) => {
        if (tocIndex < toc.length) {
            const item = toc[tocIndex++];
            return `<h${item.level} id="${item.key}">${title}</h${item.level}>`;
        }
        return match;
    });
    return result;
}

const ClassAiReportCard: React.FC<Props> = ({ classId, examId, focusGroupData }) => {
    const queryClient = useQueryClient();
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamContent, setStreamContent] = useState('');
    const [thinkingContent, setThinkingContent] = useState('');
    const [showToc, setShowToc] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['classAiReport', classId, examId],
        queryFn: () => analysisApi.getClassAiReport(String(classId), examId),
        enabled: !!classId && !!examId,
    });

    const refreshMutation = useMutation({
        mutationFn: async () => {
            setIsStreaming(true);
            setStreamContent('');
            setThinkingContent('');
            try {
                await analysisApi.refreshClassAiReportStream(classId, examId, {
                    focusGroupData,
                    onChunk: (chunk) => {
                        setStreamContent(prev => prev + chunk);
                    },
                    onThinking: (thinking) => {
                        setThinkingContent(prev => prev + thinking);
                    }
                });
                message.success('生成完成');
                queryClient.invalidateQueries({ queryKey: ['classAiReport', classId, examId] });
            } catch (error) {
                console.error('Refresh report error:', error);
                message.error('刷新报告失败');
            } finally {
                setIsStreaming(false);
                // 触发额度刷新事件
                window.dispatchEvent(new CustomEvent('ai-usage-update'));
            }
        }
    });

    const displayContent = isStreaming ? streamContent : data?.report;

    // 解析目录
    const toc = useMemo(() => extractToc(displayContent || ''), [displayContent]);

    // 复制报告到剪贴板
    const handleCopy = async () => {
        if (displayContent) {
            try {
                await navigator.clipboard.writeText(displayContent);
                message.success('报告已复制到剪贴板');
            } catch {
                message.error('复制失败');
            }
        }
    };

    // 导出为 TXT 文件
    const handleExportTxt = () => {
        if (!displayContent) return;
        const blob = new Blob([displayContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `班级诊断报告_${new Date().toLocaleDateString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('导出成功');
    };

    // 导出为 HTML 文件（可用于打印或转 PDF）
    const handleExportHtml = () => {
        if (!displayContent) return;
        const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>班级诊断报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; }
        h1, h2, h3 { color: #1890ff; border-bottom: 1px solid #e8e8e8; padding-bottom: 8px; }
        ul, ol { padding-left: 24px; }
        li { margin: 8px 0; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
${displayContent.replace(/^# /gm, '<h1>').replace(/^## /gm, '<h2>').replace(/^### /gm, '<h3>')}
</body>
</html>`;
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `班级诊断报告_${new Date().toLocaleDateString()}.html`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('导出成功，可用浏览器打开后打印为 PDF');
    };

    const exportMenuItems = [
        { key: 'copy', label: '复制到剪贴板', icon: <CopyOutlined />, onClick: handleCopy },
        { key: 'txt', label: '导出为 TXT', onClick: handleExportTxt },
        { key: 'html', label: '导出为 HTML（可转PDF）', onClick: handleExportHtml },
    ];

    return (
        <Card
            title={
                <Space>
                    <RobotOutlined style={{ color: '#1890ff' }} />
                    <Title level={5} style={{ margin: 0 }}>AI 智能诊断报告</Title>
                </Space>
            }
            extra={
                <Space>
                    {toc.length > 0 && (
                        <Button
                            type="text"
                            icon={<MenuOutlined />}
                            onClick={() => setShowToc(!showToc)}
                        >
                            {showToc ? '隐藏目录' : '目录'}
                        </Button>
                    )}
                    {displayContent && (
                        <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
                            <Button type="text" icon={<DownloadOutlined />}>
                                导出
                            </Button>
                        </Dropdown>
                    )}
                    <Button
                        type="link"
                        icon={<ReloadOutlined />}
                        loading={refreshMutation.isPending || isStreaming}
                        onClick={() => refreshMutation.mutate()}
                    >
                        重新生成
                    </Button>
                </Space>
            }
            style={{ marginBottom: 24 }}
        >
            {isLoading && !isStreaming ? (
                <Skeleton active paragraph={{ rows: 8 }} />
            ) : displayContent || thinkingContent ? (
                <div style={{ display: 'flex', gap: 24 }}>
                    {/* 目录导航 */}
                    {showToc && toc.length > 0 && (
                        <div style={{ minWidth: 200, borderRight: '1px solid #f0f0f0', paddingRight: 16 }}>
                            <Text strong style={{ display: 'block', marginBottom: 12, color: '#1890ff' }}>
                                📑 报告目录
                            </Text>
                            <Anchor
                                affix={false}
                                items={toc.map(item => ({
                                    key: item.key,
                                    href: `#${item.key}`,
                                    title: (
                                        <span style={{
                                            paddingLeft: (item.level - 1) * 12,
                                            fontSize: item.level === 1 ? 14 : 13,
                                            fontWeight: item.level === 1 ? 600 : 400
                                        }}>
                                            {item.title}
                                        </span>
                                    )
                                }))}
                            />
                        </div>
                    )}
                    {/* 报告内容 */}
                    <div style={{ flex: 1 }}>
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            {thinkingContent && (
                                <Alert
                                    message="AI 正在思考中..."
                                    description={
                                        <Collapse ghost defaultActiveKey={['1']}>
                                            <Collapse.Panel header="查看思考过程" key="1">
                                                <div style={{ color: '#8c8c8c', fontStyle: 'italic', whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                                                    {thinkingContent}
                                                </div>
                                            </Collapse.Panel>
                                        </Collapse>
                                    }
                                    type="info"
                                    showIcon
                                    icon={<BulbOutlined />}
                                />
                            )}
                            <div className="markdown-body" style={{ lineHeight: 1.8 }}>
                                <ReactMarkdown
                                    components={{
                                        h1: ({ children, ...props }) => {
                                            const index = toc.findIndex(t => t.title === String(children));
                                            const id = index >= 0 ? toc[index].key : undefined;
                                            return <h1 id={id} style={{ color: '#1890ff', borderBottom: '2px solid #1890ff', paddingBottom: 8, marginTop: 24 }} {...props}>{children}</h1>;
                                        },
                                        h2: ({ children, ...props }) => {
                                            const index = toc.findIndex(t => t.title === String(children));
                                            const id = index >= 0 ? toc[index].key : undefined;
                                            return <h2 id={id} style={{ color: '#1890ff', borderBottom: '1px solid #e8e8e8', paddingBottom: 6, marginTop: 20 }} {...props}>{children}</h2>;
                                        },
                                        h3: ({ children, ...props }) => {
                                            const index = toc.findIndex(t => t.title === String(children));
                                            const id = index >= 0 ? toc[index].key : undefined;
                                            return <h3 id={id} style={{ color: '#333', marginTop: 16 }} {...props}>{children}</h3>;
                                        },
                                    }}
                                >
                                    {displayContent}
                                </ReactMarkdown>
                            </div>
                        </Space>
                    </div>
                </div>
            ) : (
                <Empty description="暂无报告，请点击重新生成" />
            )}
        </Card>
    );
};

export default ClassAiReportCard;
