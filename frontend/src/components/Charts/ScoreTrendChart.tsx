import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Tag } from 'antd';
import ChartWrapper from './ChartWrapper';

interface ScoreTrendChartProps {
    data: any[];
    height?: number;
    title?: string;
}

export default function ScoreTrendChart({ data, height = 320, title }: ScoreTrendChartProps) {
    return (
        <div className="chart-container">
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {title && <span style={{ fontSize: 16, fontWeight: 500 }}>{title}</span>}
                <Tag color="blue">近 {data?.length || 0} 次考试</Tag>
            </div>
            <ChartWrapper height={height}>
                <LineChart data={data || []}>
                    <defs>
                        <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="exam_name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                        cursor={{ stroke: 'var(--primary-color)', strokeWidth: 1, strokeDasharray: '5 5' }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Line
                        type="monotone"
                        dataKey="average_score"
                        name="班级平均分"
                        stroke="var(--primary-color)"
                        strokeWidth={4}
                        dot={{ fill: 'var(--primary-color)', strokeWidth: 2, r: 4, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        animationDuration={1500}
                    />
                </LineChart>
            </ChartWrapper>
        </div>
    );
}
