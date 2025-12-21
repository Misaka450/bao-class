import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Spin, Typography, Empty, Space, Tag, Alert } from 'antd';
import { RobotOutlined, ReloadOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Paragraph, Title } = Typography;

interface ClassAiReportCardProps {
    classId: string;
    examId: number;
}

const ClassAiReportCard: React.FC<ClassAiReportCardProps> = ({ classId, examId }) => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<string>('');
    const [cached, setCached] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReport = useCallback(async (isRefresh = false) => {
        if (!classId || !examId) return;

        setLoading(true);
        setError(null);
        try {
            if (isRefresh) {
                // When refreshing, call refresh endpoint which returns the new report directly
                const response = await api.analysis.refreshClassAiReport(classId, examId);
                if (response.success && response.report) {
                    setReport(response.report);
                    setCached(false);
                } else {
                    throw new Error(response.error || '刷新报告失败');
                }
            } else {
                // Normal fetch from the GET endpoint
                const response = await api.analysis.getClassAiReport(classId, examId);
                setReport(response.report);
                setCached(response.cached);
            }
        } catch (err: any) {
            console.error('Failed to fetch AI report:', err);
            setError(err.message || '获取分析报告失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    }, [classId, examId]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const renderAction = () => (
        <Button
            type="text"
            size="small"
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => fetchReport(true)}
            disabled={loading}
        >
            重新诊断
        </Button>
    );

    return (
        <Card
            title={
                <Space>
                    <RobotOutlined style={{ color: '#1890ff' }} />
                    <span style={{ fontWeight: 600 }}>AI 智能学情诊断</span>
                    {cached && <Tag color="default" icon={<CheckCircleOutlined />}>已缓存</Tag>}
                </Space>
            }
            extra={renderAction()}
            className="chart-card"
            style={{ height: '100%', minHeight: 400 }}
            bodyStyle={{ padding: '20px 24px' }}
        >
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                    <Spin size="large" />
                    <Paragraph style={{ marginTop: 16, color: '#666' }}>
                        专家正在深度分析本次考试数据，请稍候...
                    </Paragraph>
                </div>
            ) : error ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <Space direction="vertical">
                            <span>{error}</span>
                            <Button type="primary" size="small" onClick={() => fetchReport()}>重试</Button>
                        </Space>
                    }
                />
            ) : report ? (
                <div style={{ overflowY: 'auto', maxHeight: 600 }}>
                    {cached && (
                        <Alert
                            message="此报告基于历史数据快照。如果成绩已更新，请点击右上方重新诊断。"
                            type="info"
                            showIcon
                            icon={<InfoCircleOutlined />}
                            style={{ marginBottom: 16 }}
                            closable
                        />
                    )}
                    <Typography>
                        <div dangerouslySetInnerHTML={{
                            __html: report
                                .replace(/\n/g, '<br/>')
                                // 处理Markdown标题符号（####, ###, ##, #），移除#但保留文字
                                .replace(/^####\s+(.*?)$/gm, '<strong style="font-size:14px;display:block;margin-top:12px;">$1</strong>')
                                .replace(/^###\s+(.*?)$/gm, '<strong style="font-size:15px;display:block;margin-top:14px;">$1</strong>')
                                .replace(/^##\s+(.*?)$/gm, '<strong style="font-size:16px;display:block;margin-top:16px;">$1</strong>')
                                .replace(/^#\s+(.*?)$/gm, '<strong style="font-size:18px;display:block;margin-top:18px;">$1</strong>')
                                // 处理【】符号的章节标题
                                .replace(/【(.*?)】/g, '<h4 style="color:#1890ff;margin-top:16px;">【$1】</h4>')
                                // 处理**加粗
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        }} />
                    </Typography>
                </div>
            ) : (
                <Empty description="暂无分析数据" />
            )}
        </Card>
    );
};

export default ClassAiReportCard;
