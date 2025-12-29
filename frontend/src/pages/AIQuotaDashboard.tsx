import React, { useEffect, useState } from 'react';
import { Card, Table, Progress, Spin, Empty, Statistic, Row, Col, Tag, Typography, Tooltip } from 'antd';
import { ThunderboltOutlined, ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { aiApi } from '../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;

interface ModelQuota {
    model: string;
    userLimit: number | null;
    userRemaining: number | null;
    modelLimit: number | null;
    modelRemaining: number | null;
    updatedAt: string;
}

/**
 * AI 额度监控仪表盘
 * 展示用户和各模型的 API 额度使用情况
 */
const AIQuotaDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [quotas, setQuotas] = useState<ModelQuota[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const quotasRes = await aiApi.getModelQuotas();
            setQuotas(quotasRes || []);
        } catch (error) {
            console.error('获取额度数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 从最新记录中获取用户额度（用户额度在所有模型中是相同的）
    const latestQuota = quotas.length > 0 ? quotas[0] : null;
    const userLimit = latestQuota?.userLimit ?? null;
    const userRemaining = latestQuota?.userRemaining ?? null;
    const userUsed = userLimit !== null && userRemaining !== null ? userLimit - userRemaining : null;

    // 计算进度条百分比和颜色
    const getProgressInfo = (remaining: number | null, limit: number | null) => {
        if (remaining === null || limit === null || limit === 0) {
            return { percent: 0, status: 'normal' as const, color: '#d9d9d9' };
        }
        const percent = Math.round((remaining / limit) * 100);
        if (percent <= 10) return { percent, status: 'exception' as const, color: '#ff4d4f' };
        if (percent <= 30) return { percent, status: 'normal' as const, color: '#faad14' };
        return { percent, status: 'success' as const, color: '#52c41a' };
    };

    // 提取模型短名称
    const getModelShortName = (model: string) => {
        const parts = model.split('/');
        return parts[parts.length - 1];
    };

    const columns = [
        {
            title: '模型',
            dataIndex: 'model',
            key: 'model',
            render: (model: string) => (
                <Tooltip title={model}>
                    <Tag color="blue">{getModelShortName(model)}</Tag>
                </Tooltip>
            ),
        },
        {
            title: '模型日限额',
            key: 'modelQuota',
            render: (_: any, record: ModelQuota) => {
                const { percent, color } = getProgressInfo(record.modelRemaining, record.modelLimit);
                return (
                    <div style={{ minWidth: 150 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text type="secondary">剩余 {record.modelRemaining ?? '-'}</Text>
                            <Text type="secondary">/ {record.modelLimit ?? '-'}</Text>
                        </div>
                        <Progress
                            percent={percent}
                            size="small"
                            strokeColor={color}
                            showInfo={false}
                        />
                    </div>
                );
            },
        },
        {
            title: '更新时间',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (time: string) => (
                <Tooltip title={dayjs(time).format('YYYY-MM-DD HH:mm:ss')}>
                    <span>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {dayjs(time).fromNow()}
                    </span>
                </Tooltip>
            ),
        },
    ];

    const userQuotaInfo = getProgressInfo(userRemaining, userLimit);

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>
                    <ThunderboltOutlined style={{ marginRight: 8, color: '#6C5DD3' }} />
                    AI 额度监控
                </Title>
                <Tooltip title="刷新数据">
                    <ReloadOutlined
                        style={{ fontSize: 18, cursor: 'pointer', color: '#1890ff' }}
                        spin={loading}
                        onClick={fetchData}
                    />
                </Tooltip>
            </div>

            {/* 用户日额度统计卡片 */}
            {userLimit !== null && (
                <Card style={{ marginBottom: 24 }} size="small">
                    <Row gutter={24}>
                        <Col span={8}>
                            <Statistic
                                title="今日已用"
                                value={userUsed ?? '-'}
                                suffix="次"
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Col>
                        <Col span={8}>
                            <Statistic
                                title="用户日限额"
                                value={userLimit}
                                suffix="次"
                            />
                        </Col>
                        <Col span={8}>
                            <Statistic
                                title="剩余额度"
                                value={userRemaining ?? '-'}
                                suffix="次"
                                valueStyle={{ color: userQuotaInfo.color }}
                            />
                        </Col>
                    </Row>
                    <Progress
                        percent={userQuotaInfo.percent}
                        status={userQuotaInfo.status}
                        style={{ marginTop: 16 }}
                    />
                </Card>
            )}

            {/* 模型额度表格 */}
            <Card title="各模型 API 额度" size="small">
                <Spin spinning={loading}>
                    {quotas.length > 0 ? (
                        <Table
                            dataSource={quotas}
                            columns={columns}
                            rowKey="model"
                            pagination={false}
                            size="small"
                        />
                    ) : (
                        <Empty
                            description="暂无模型额度数据，请先调用 AI 功能后查看"
                            style={{ padding: '40px 0' }}
                        />
                    )}
                </Spin>
            </Card>

            <Card size="small" style={{ marginTop: 16 }}>
                <Text type="secondary">
                    💡 提示：额度数据来源于 ModelScope API 响应头，每次调用 AI 功能后会自动更新。
                    用户日限额为账户级别限制，模型日限额为单个模型的限制。
                </Text>
            </Card>
        </div>
    );
};

export default AIQuotaDashboard;
