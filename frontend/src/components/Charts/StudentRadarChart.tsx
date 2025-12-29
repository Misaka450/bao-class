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
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[-3, 3]} />
                        <Radar
                            name="个人表现"
                            dataKey="zScore"
                            stroke="var(--primary-color)"
                            fill="var(--primary-color)"
                            fillOpacity={0.6}
                            animationDuration={1500}
                        />
                        <Tooltip cursor={{ stroke: 'var(--primary-color)', strokeWidth: 1 }} />
                        <Legend />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default StudentRadarChart;
