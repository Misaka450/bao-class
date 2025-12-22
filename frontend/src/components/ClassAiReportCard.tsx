import React, { useState } from 'react';
import { Card, Button, Typography, Skeleton, Empty, Space, message, Alert, Collapse } from 'antd';
import { RobotOutlined, ReloadOutlined, BulbOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisApi } from '../services/api';
import ReactMarkdown from 'react-markdown';

const { Title } = Typography;

interface Props {
    classId: number;
    examId: number;
}

const ClassAiReportCard: React.FC<Props> = ({ classId, examId }) => {
    const queryClient = useQueryClient();
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamContent, setStreamContent] = useState('');
    const [thinkingContent, setThinkingContent] = useState('');

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
                await analysisApi.refreshClassAiReportStream(String(classId), examId, {
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
            }
        }
    });

    const displayContent = isStreaming ? streamContent : data?.report;

    return (
        <Card
            title={
                <Space>
                    <RobotOutlined style={{ color: '#1890ff' }} />
                    <Title level={5} style={{ margin: 0 }}>AI 智能诊断报告</Title>
                </Space>
            }
            extra={
                <Button
                    type="link"
                    icon={<ReloadOutlined />}
                    loading={refreshMutation.isPending || isStreaming}
                    onClick={() => refreshMutation.mutate()}
                >
                    重新生成
                </Button>
            }
            style={{ marginBottom: 24 }}
        >
            {isLoading && !isStreaming ? (
                <Skeleton active paragraph={{ rows: 6 }} />
            ) : displayContent || thinkingContent ? (
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
                    <div className="markdown-body">
                        <ReactMarkdown>{displayContent}</ReactMarkdown>
                    </div>
                </Space>
            ) : (
                <Empty description="暂无报告，请点击重新生成" />
            )}
        </Card>
    );
};

export default ClassAiReportCard;
