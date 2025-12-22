import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import ChartWrapper from './ChartWrapper';

interface SubjectRadarChartProps {
    data: any[];
    height?: number;
    title?: string;
}

export default function SubjectRadarChart({ data, height = 320, title }: SubjectRadarChartProps) {
    if (!data || data.length === 0) return null;

    return (
        <div className="chart-container">
            {title && <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>{title}</div>}
            <ChartWrapper height={height}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="平均分"
                        dataKey="score"
                        stroke="var(--primary-color)"
                        fill="var(--primary-color)"
                        fillOpacity={0.6}
                        animationDuration={1500}
                    />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                </RadarChart>
            </ChartWrapper>
        </div>
    );
}
