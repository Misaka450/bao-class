import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartWrapper from './ChartWrapper';

interface ScoreDistributionData {
    subject: string;
    fail: number;
    pass: number;
    good: number;
    excellent: number;
}

interface Props {
    data: ScoreDistributionData[] | null;
    loading?: boolean;
}

const ScoreDistributionChart: React.FC<Props> = ({ data, loading }) => {
    if (loading) {
        return <ChartWrapper loading height={400} />;
    }

    if (!data || data.length === 0) {
        return <ChartWrapper empty height={400} />;
    }

    return (
        <ChartWrapper height={400}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip
                        formatter={(value: number, name: string) => {
                            const map: Record<string, string> = {
                                fail: '不及格 (<60)',
                                pass: '及格 (60-75)',
                                good: '良好 (75-85)',
                                excellent: '优秀 (85-100)'
                            };
                            return [value, map[name] || name];
                        }}
                    />
                    <Legend
                        formatter={(value: string) => {
                            const map: Record<string, string> = {
                                fail: '不及格',
                                pass: '及格',
                                good: '良好',
                                excellent: '优秀'
                            };
                            return map[value] || value;
                        }}
                    />
                    <Bar dataKey="fail" name="fail" stackId="a" fill="#ff4d4f" animationDuration={1500} />
                    <Bar dataKey="pass" name="pass" stackId="a" fill="#faad14" animationDuration={1500} />
                    <Bar dataKey="good" name="good" stackId="a" fill="#1890ff" animationDuration={1500} />
                    <Bar dataKey="excellent" name="excellent" stackId="a" fill="#52c41a" animationDuration={1500} />
                </BarChart>
            </ResponsiveContainer>
        </ChartWrapper>
    );
};

export default ScoreDistributionChart;
