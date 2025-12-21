import React from 'react';
import { Card } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SkeletonLoading } from '../Feedback/Loading/SkeletonLoading';

interface DistributionData {
    range: string;
    count: number;
}

interface Props {
    data: DistributionData[] | null;
    loading?: boolean;
    title?: string;
}

const SimpleDistributionChart: React.FC<Props> = ({ data, loading, title = "成绩分布" }) => {
    if (loading) {
        return (
            <Card bordered={false} className="glass-card">
                <SkeletonLoading active rows={6} />
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card bordered={false} className="glass-card" style={{ minHeight: 360 }}>
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                    暂无数据
                </div>
            </Card>
        );
    }

    const COLORS = ['#ff4d4f', '#faad14', '#1890ff', '#52c41a', '#722ed1'];

    return (
        <Card
            bordered={false}
            className="glass-card"
            title={<span style={{ fontWeight: 600, fontSize: '16px' }}>{title}</span>}
            bodyStyle={{ padding: '24px', height: 360 }}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="range"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    />
                    <Bar
                        dataKey="count"
                        name="人数"
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                        animationDuration={1500}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </Card>
    );
};

export default SimpleDistributionChart;
