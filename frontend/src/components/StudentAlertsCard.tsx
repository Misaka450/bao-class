import React, { useEffect, useState } from 'react';
import { Card, List, Tag, Tabs, Spin, Empty } from 'antd';
import { WarningOutlined, FallOutlined, RiseOutlined, SwapOutlined } from '@ant-design/icons';
import type { FocusGroupResult, StudentAlert } from '../types/models';
import api from '../services/api';

interface StudentAlertsCardProps {
    classId?: number;
}

const StudentAlertsCard: React.FC<StudentAlertsCardProps> = ({ classId }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<FocusGroupResult | null>(null);

    useEffect(() => {
        if (classId) {
            fetchAlerts();
        }
    }, [classId]);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const result = await api.analysis.getFocusGroup(classId!.toString());
            setData(result);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderList = (list: StudentAlert[]) => {
        if (!list || list.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无预警信息" />;

        return (
            <List
                dataSource={list}
                renderItem={item => (
                    <List.Item>
                        <List.Item.Meta
                            title={<span>{item.name}</span>}
                            description={
                                <div>
                                    {item.subject && <Tag>{item.subject}</Tag>}
                                    {item.score !== undefined && <span>分数: {item.score}</span>}
                                    {item.drop_amount !== undefined && <span style={{ color: 'red' }}>退步: {item.drop_amount.toFixed(1)}分</span>}
                                    {item.score_diff !== undefined && <span>分差: {item.score_diff}</span>}
                                    {item.failed_score !== undefined && <span style={{ color: 'red' }}>不及格: {item.failed_score}</span>}
                                </div>
                            }
                        />
                    </List.Item>
                )}
            />
        );
    };

    const items = [
        {
            key: '1',
            label: (
                <span>
                    <WarningOutlined /> 临界生
                    {data?.critical?.length ? <Tag color="error" style={{ marginLeft: 5 }}>{data.critical.length}</Tag> : null}
                </span>
            ),
            children: renderList(data?.critical || []),
        },
        {
            key: '2',
            label: (
                <span>
                    <FallOutlined /> 退步明显
                    {data?.regressing?.length ? <Tag color="warning" style={{ marginLeft: 5 }}>{data.regressing.length}</Tag> : null}
                </span>
            ),
            children: renderList(data?.regressing || []),
        },
        {
            key: '3',
            label: (
                <span>
                    <RiseOutlined /> 波动较大
                    {data?.fluctuating?.length ? <Tag color="processing" style={{ marginLeft: 5 }}>{data.fluctuating.length}</Tag> : null}
                </span>
            ),
            children: renderList(data?.fluctuating || []),
        },
        {
            key: '4',
            label: (
                <span>
                    <SwapOutlined /> 偏科严重
                    {data?.imbalanced?.length ? <Tag color="purple" style={{ marginLeft: 5 }}>{data.imbalanced.length}</Tag> : null}
                </span>
            ),
            children: renderList(data?.imbalanced || []),
        },
    ];

    return (
        <Card
            title="智能学情预警"
            className="chart-card"
            style={{ height: '100%' }}
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: 30 }}>
                    <Spin />
                </div>
            ) : (
                <Tabs defaultActiveKey="1" items={items} />
            )}
        </Card>
    );
};

export default StudentAlertsCard;
