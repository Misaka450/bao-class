import React, { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceDot, Area } from 'recharts';
import { Card, Row, Col, Statistic, Alert, Tag } from 'antd';
import { RiseOutlined, FallOutlined, WarningOutlined } from '@ant-design/icons';

interface Props {
    data: any[];
}

// 计算线性回归趋势线
const calculateTrendline = (data: any[]) => {
    const n = data.length;
    if (n < 2) return [];

    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.total_score, 0);
    const sumXY = data.reduce((sum, d, i) => sum + (i * d.total_score), 0);
    const sumX2 = data.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((d, i) => ({
        exam_name: d.exam_name,
        trend: parseFloat((slope * i + intercept).toFixed(1))
    }));
};

// 分析波动
const analyzeVolatility = (data: any[]) => {
    if (data.length < 2) return { processed: data, stats: null };

    const processed = data.map((exam, i) => {
        if (i === 0) {
            return {
                ...exam,
                volatility: 0,
                change: 0,
                changePercent: 0,
                isAbnormal: false
            };
        }

        const prev = data[i - 1].total_score;
        const curr = exam.total_score;
        const change = curr - prev;
        const changePercent = (change / prev) * 100;

        return {
            ...exam,
            volatility: Math.abs(change),
            change,
            changePercent: parseFloat(changePercent.toFixed(1)),
            isAbnormal: Math.abs(changePercent) > 10  // 波动超过10%为异常
        };
    });

    // 统计
    const volatilities = processed.slice(1).map(d => d.volatility);
    const avgVolatility = volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
    const maxProgress = Math.max(...processed.map(d => d.change || 0));
    const abnormalExams = processed.filter(d => d.isAbnormal);

    return {
        processed,
        stats: {
            avgVolatility: parseFloat(avgVolatility.toFixed(1)),
            maxProgress: parseFloat(maxProgress.toFixed(1)),
            abnormalCount: abnormalExams.length,
            abnormalExams
        }
    };
};

const StudentHistoryChart: React.FC<Props> = ({ data }) => {
    const { processed, stats } = useMemo(() => analyzeVolatility(data), [data]);
    const trendline = useMemo(() => calculateTrendline(data), [data]);

    // 合并数据
    const chartData = processed.map((d, i) => ({
        ...d,
        trend: trendline[i]?.trend
    }));

    return (
        <div>
            {/* 波动统计 */}
            {stats && stats.abnormalCount > 0 && (
                <Alert
                    type="warning"
                    message={
                        <div>
                            <WarningOutlined style={{ marginRight: 8 }} />
                            检测到 <strong>{stats.abnormalCount}</strong> 次成绩异常波动
                        </div>
                    }
                    description={
                        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                            {stats.abnormalExams.map((exam: any, idx: number) => (
                                <li key={idx}>
                                    <strong>{exam.exam_name}</strong>:
                                    {exam.change > 0 ? '+' : ''}{exam.change.toFixed(1)}分
                                    ({exam.changePercent > 0 ? '+' : ''}{exam.changePercent}%)
                                </li>
                            ))}
                        </ul>
                    }
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            {stats && (
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                        <Card size="small">
                            <Statistic
                                title="平均波动"
                                value={stats.avgVolatility}
                                precision={1}
                                suffix="分"
                                valueStyle={{ color: '#1890ff', fontSize: 20 }}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card size="small">
                            <Statistic
                                title="最大进步"
                                value={stats.maxProgress}
                                precision={1}
                                suffix="分"
                                prefix={stats.maxProgress > 0 ? <RiseOutlined /> : <FallOutlined />}
                                valueStyle={{ color: stats.maxProgress > 0 ? '#3f8600' : '#cf1322', fontSize: 20 }}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card size="small">
                            <Statistic
                                title="异常考试"
                                value={stats.abnormalCount}
                                suffix="次"
                                valueStyle={{ color: stats.abnormalCount > 0 ? '#cf1322' : '#52c41a', fontSize: 20 }}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            <Card title="成绩与排名双轴趋势" bordered={false}>
                <div style={{ width: '100%', height: 400, minHeight: 400, position: 'relative' }}>
                    <ResponsiveContainer width="99%" height={400} minWidth={0}>
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="exam_name" angle={-15} textAnchor="end" height={60} />
                            <YAxis yAxisId="left" label={{ value: '总分', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" reversed label={{ value: '排名', angle: 90, position: 'insideRight' }} allowDecimals={false} />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div style={{ background: 'white', padding: 12, border: '1px solid #ccc', borderRadius: 4 }}>
                                                <p style={{ margin: 0, fontWeight: 'bold' }}>{data.exam_name}</p>
                                                <p style={{ margin: '4px 0 0 0', color: '#1890ff' }}>
                                                    总分: {data.total_score?.toFixed(1)}
                                                </p>
                                                <p style={{ margin: '4px 0 0 0', color: '#52c41a' }}>
                                                    排名: {data.class_rank}
                                                </p>
                                                {data.class_avg && (
                                                    <p style={{ margin: '4px 0 0 0', color: '#faad14' }}>
                                                        班均: {data.class_avg?.toFixed(1)}
                                                        ({data.total_score >= data.class_avg ? '+' : ''}
                                                        {(data.total_score - data.class_avg).toFixed(1)})
                                                    </p>
                                                )}
                                                {data.change !== undefined && data.change !== 0 && (
                                                    <p style={{ margin: '4px 0 0 0', color: data.change > 0 ? '#3f8600' : '#cf1322' }}>
                                                        波动: {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}分
                                                        {data.isAbnormal && <Tag color="red" style={{ marginLeft: 4 }}>异常</Tag>}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend />

                            {/* 班级平均与学生成绩的差值区域 */}
                            {chartData[0]?.class_avg && (
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="class_avg"
                                    fill="#ffd591"
                                    fillOpacity={0.2}
                                    stroke="none"
                                    animationDuration={1500}
                                />
                            )}

                            {/* 学生成绩线 */}
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="total_score"
                                stroke="#1890ff"
                                name="我的总分"
                                strokeWidth={3}
                                dot={(props: any) => {
                                    const { cx, cy, payload } = props;
                                    return (
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={payload.isAbnormal ? 8 : 5}
                                            fill={payload.isAbnormal ? '#ff4d4f' : '#1890ff'}
                                            stroke={payload.isAbnormal ? '#fff' : 'none'}
                                            strokeWidth={payload.isAbnormal ? 2 : 0}
                                        />
                                    );
                                }}
                                activeDot={{ r: 8 }}
                                animationDuration={1500}
                            />

                            {/* 班级平均线 */}
                            {chartData[0]?.class_avg && (
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="class_avg"
                                    stroke="#faad14"
                                    name="班级平均"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    animationDuration={1500}
                                />
                            )}

                            {/* 趋势线 */}
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="trend"
                                stroke="#52c41a"
                                name="趋势线"
                                strokeWidth={2}
                                strokeDasharray="3 3"
                                dot={false}
                                animationDuration={1500}
                            />

                            {/* 排名线 */}
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="class_rank"
                                stroke="#82ca9d"
                                name="班级排名"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                animationDuration={1500}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* 图例说明 */}
                <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4, fontSize: 12 }}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>● </span>
                            实线：我的总分
                        </Col>
                        <Col span={8}>
                            <span style={{ color: '#faad14', fontWeight: 'bold' }}>- - </span>
                            虚线：班级平均
                        </Col>
                        <Col span={8}>
                            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>- - </span>
                            虚线：趋势线
                        </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 8 }}>
                        <Col span={24}>
                            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>🔴 </span>
                            红色大圆点：异常波动考试（波动超过10%）
                        </Col>
                    </Row>
                </div>
            </Card>
        </div>
    );
};

export default StudentHistoryChart;
