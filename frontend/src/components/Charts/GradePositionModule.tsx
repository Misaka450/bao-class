import { Row, Col, Statistic, Empty } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { TrophyOutlined, RiseOutlined } from '@ant-design/icons';
import ChartWrapper from './ChartWrapper';

interface GradePositionModuleProps {
    gradeData: any;
    currentClassInfo: any;
    averageGradeScore: number;
    scoreDiff: number;
}

export default function GradePositionModule({ gradeData, currentClassInfo, averageGradeScore, scoreDiff }: GradePositionModuleProps) {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>当前考试年级定位</div>
            {gradeData && currentClassInfo ? (
                <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col span={12}>
                            <Statistic
                                title="年级排名"
                                value={gradeData.current_class.rank}
                                suffix={`/ ${gradeData.classes.length}`}
                                valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
                                prefix={<TrophyOutlined />}
                            />
                        </Col>
                        <Col span={12}>
                            <Statistic
                                title="超年级均分"
                                value={scoreDiff.toFixed(1)}
                                valueStyle={{ color: scoreDiff >= 0 ? '#52c41a' : '#ff4d4f' }}
                                prefix={<RiseOutlined />}
                            />
                        </Col>
                    </Row>
                    <ChartWrapper height={240}>
                        <BarChart data={gradeData.classes} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="class_name" type="category" width={80} tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-sm)' }} cursor={{ fill: 'transparent' }} />
                            <Bar dataKey="average_score" name="平均分" barSize={20} radius={[0, 4, 4, 0]}>
                                {gradeData.classes.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.class_id === gradeData.current_class.class_id ? 'var(--primary-color)' : '#e2e8f0'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartWrapper>
                </>
            ) : <Empty description="暂无年级数据" />}
        </div>
    );
}
