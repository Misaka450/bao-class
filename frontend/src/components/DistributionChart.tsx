import { Card } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { Distribution } from '../types';

interface DistributionChartProps {
    data: Distribution[];
    isCourseSelected: boolean;
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export default function DistributionChart({ data, isCourseSelected }: DistributionChartProps) {
    return (
        <Card title={isCourseSelected ? "分数段分布" : "总分分布"} className="chart-card" bodyStyle={{ height: 360 }}>
            <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey="range" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                        <Bar dataKey="count" name="人数" radius={[6, 6, 0, 0]}>
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
