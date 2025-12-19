import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card } from 'antd';

interface Props {
    data: any[];
}

const StudentHistoryChart: React.FC<Props> = ({ data }) => {
    return (
        <Card title="成绩与排名双轴趋势" bordered={false}>
            <div style={{ width: '100%', height: 300, minHeight: 300, position: 'relative' }}>
                <ResponsiveContainer width="99%" height={300} minWidth={0}>
                    <ComposedChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="exam_name" angle={-15} textAnchor="end" height={60} />
                        <YAxis yAxisId="left" label={{ value: '总分', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" reversed label={{ value: '排名', angle: 90, position: 'insideRight' }} allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="total_score" stroke="#8884d8" name="总分" strokeWidth={2} dot={{ r: 4 }} />
                        <Line yAxisId="right" type="monotone" dataKey="class_rank" stroke="#82ca9d" name="班级排名" strokeWidth={2} dot={{ r: 4 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default StudentHistoryChart;
