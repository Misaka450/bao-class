import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Tooltip, Spin, Empty } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { ExamQuality } from '../types/models';
import api from '../services/api';

interface ExamQualityCardProps {
    examId?: number;
}

const ExamQualityCard: React.FC<ExamQualityCardProps> = ({ examId }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ExamQuality[]>([]);

    useEffect(() => {
        const fetchQualityData = async () => {
            setLoading(true);
            try {
                const result = await api.analysis.getExamQuality(examId!);
                setData(result);
            } catch (error) {
                console.error('Failed to fetch exam quality:', error);
            } finally {
                setLoading(false);
            }
        };

        if (examId) {
            fetchQualityData();
        }
    }, [examId]);

    const getDifficultyTag = (val: number) => {
        if (val > 0.7) return <Tag color="success">简单</Tag>;
        if (val < 0.4) return <Tag color="error">困难</Tag>;
        return <Tag color="warning">适中</Tag>;
    };

    const getDiscriminationTag = (val: number) => {
        if (val > 0.4) return <Tag color="success">优秀</Tag>;
        if (val < 0.2) return <Tag color="error">较差</Tag>;
        return <Tag color="warning">一般</Tag>;
    };

    const columns = [
        {
            title: '科目',
            dataIndex: 'course_name',
            key: 'course_name',
        },
        {
            title: '难度系数',
            dataIndex: ['stats', 'difficulty'],
            key: 'difficulty',
            render: (val: number) => (
                <Tooltip title="平均分/满分 (0.4-0.7为宜)">
                    <span>{val} {getDifficultyTag(val)}</span>
                </Tooltip>
            ),
        },
        {
            title: '区分度',
            dataIndex: ['stats', 'discrimination'],
            key: 'discrimination',
            render: (val: number) => (
                <Tooltip title="高分组与低分组平均分之差/满分 (>0.3为宜)">
                    <span>{val} {getDiscriminationTag(val)}</span>
                </Tooltip>
            ),
        },
        {
            title: '标准差',
            dataIndex: ['stats', 'std_dev'],
            key: 'std_dev',
            render: (val: number) => (
                <Tooltip title="反映分数离散程度">
                    {val}
                </Tooltip>
            ),
        },
        {
            title: '平均分',
            dataIndex: ['stats', 'avg'],
            key: 'avg',
        }
    ];

    return (
        <Card
            title={
                <span>
                    <InfoCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    试卷质量评估
                </span>
            }
            className="chart-card"
            style={{ marginTop: 24 }}
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: 30 }}>
                    <Spin />
                </div>
            ) : data.length > 0 ? (
                <Table
                    dataSource={data}
                    columns={columns}
                    rowKey="course_id"
                    pagination={false}
                    size="small"
                />
            ) : (
                <Empty description="暂无数据" />
            )}
        </Card>
    );
};

export default ExamQualityCard;
