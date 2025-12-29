import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import ChartWrapper from './ChartWrapper';

interface SubjectRadarChartProps {
    data: any[];
    height?: number;
}

export default function SubjectRadarChart({ data, height = 300 }: SubjectRadarChartProps) {
    const radarData = data || [];

    return (
        <div className="chart-container">
            <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>科目均衡度分析</div>
            <ChartWrapper height={height}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                    <Radar
                        name="平均分"
                        dataKey="score"
                        stroke="var(--primary-color)"
                        fill="var(--primary-color)"
                        fillOpacity={0.5}
                    />
                    <Tooltip cursor={{ stroke: 'var(--primary-color)', strokeWidth: 1 }} />
                </RadarChart>
            </ChartWrapper>
        </div>
    );
}
