import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from 'antd';

interface Props {
    data: any[];
}

const StudentRadarChart: React.FC<Props> = ({ data }) => {
    return (
        <Card title="学科能力雷达 (Z-Score)" bordered={false}>
            <div style={{ width: '100%', height: 300, minHeight: 300, position: 'relative' }}>
                <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[-3, 3]} />
                        <Radar name="个人表现" dataKey="zScore" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                        <Tooltip />
                        <Legend />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default StudentRadarChart;
