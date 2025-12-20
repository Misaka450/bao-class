import { useState, useEffect, useMemo } from 'react';
import { Card, Select, Spin, Typography, Row, Col, Empty, Statistic, Space, Tag } from 'antd';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts';
import { TrophyOutlined, RiseOutlined } from '@ant-design/icons';
import ClassAiReportCard from '../components/ClassAiReportCard';
import { useClassList } from '../hooks/useClassList';
import { useExamList } from '../hooks/useExamList';
import { useClassTrend, useClassSubjectTrend, useGradeComparison } from '../hooks/useClassAnalysis';
import PageHeader from '../components/PageHeader';
import ChartWrapper from '../components/ChartWrapper';

const { Title } = Typography;

export default function ClassAnalysis() {
    const { data: classes = [] } = useClassList();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedExamId, setSelectedExamId] = useState<string>('');

    useEffect(() => {
        if (classes.length > 0 && !selectedClassId) {
            setSelectedClassId(classes[0].id.toString());
        }
    }, [classes, selectedClassId]);

    const { data: trendData, isLoading: loadingTrend } = useClassTrend(selectedClassId ? Number(selectedClassId) : undefined);
    const { data: subjectData, isLoading: loadingSubject } = useClassSubjectTrend(selectedClassId ? Number(selectedClassId) : undefined);

    const { data: exams = [] } = useExamList({ classId: selectedClassId, enabled: !!selectedClassId });

    // 自动选择考试逻辑
    useEffect(() => {
        if (exams.length > 0) {
            const currentExamExists = exams.some(e => e.id.toString() === selectedExamId);
            if (!currentExamExists || !selectedExamId) {
                setSelectedExamId(exams[0].id.toString());
            }
        } else if (exams.length === 0 && selectedExamId) {
            setSelectedExamId('');
        }
    }, [exams, selectedExamId]);

    const { data: gradeData, isLoading: loadingGrade } = useGradeComparison(
        selectedClassId ? Number(selectedClassId) : undefined,
        selectedExamId ? Number(selectedExamId) : undefined
    );

    const loading = loadingTrend || loadingSubject || loadingGrade;

    // Render functions for each tab
    const renderComprehensiveModule = () => {
        const currentClassInfo = gradeData ? gradeData.classes.find((c: any) => c.class_id === gradeData.current_class.class_id) : null;
        const averageGradeScore = gradeData ? (gradeData.classes.reduce((acc: number, cur: any) => acc + cur.average_score, 0) / gradeData.classes.length) : 0;
        const scoreDiff = currentClassInfo ? (currentClassInfo.average_score - averageGradeScore) : 0;

        return (
            <Card title="📊 综合成绩与排名分析" bordered={false} className="glass-card" style={{ marginBottom: 24 }}>
                <Row gutter={[24, 24]}>
                    {/* 左侧：平均分走势 */}
                    <Col xs={24} lg={14}>
                        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 16, fontWeight: 500 }}>班级平均分历史走势</span>
                            <Tag color="blue">近 {trendData?.trends?.length || 0} 次考试</Tag>
                        </div>
                        <ChartWrapper height={320}>
                            <LineChart data={trendData?.trends || []}>
                                <defs>
                                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="exam_name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
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
                    </Col>

                    {/* 右侧：年级对比概览 */}
                    <Col xs={24} lg={10}>
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
                                    <div style={{ flex: 1, minHeight: 200 }}>
                                        <ChartWrapper height={240}>
                                            <BarChart data={gradeData.classes} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="class_name" type="category" width={80} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                                <Bar dataKey="average_score" name="平均分" barSize={20} radius={[0, 4, 4, 0]} animationDuration={1500}>
                                                    {gradeData.classes.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.class_id === gradeData.current_class.class_id ? 'var(--primary-color)' : '#e2e8f0'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ChartWrapper>
                                    </div>
                                </>
                            ) : <Empty description="暂无年级数据" />}
                        </div>
                    </Col>
                </Row>
            </Card>
        );
    };

    const renderSubjectModule = () => {
        if (!subjectData?.subjects?.length) return null;

        const latestExamIndex = (subjectData.subjects[0]?.trends?.length || 0) - 1;
        const radarData = subjectData.subjects.map((sub: any) => ({
            subject: sub.course_name,
            score: sub.trends[latestExamIndex]?.average_score || 0,
            fullMark: 100 // 假设满分100，实际应从API获取
        }));

        return (
            <Card title="🧬 学科优劣势透视" bordered={false} className="glass-card">
                <Row gutter={[24, 24]}>
                    {/* 左侧：学科雷达 */}
                    <Col xs={24} lg={10}>
                        <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 500 }}>学科能力模型</div>
                        <ChartWrapper height={320}>
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="平均分" dataKey="score" stroke="var(--primary-color)" fill="var(--primary-color)" fillOpacity={0.6} animationDuration={1500} />
                                <Tooltip />
                            </RadarChart>
                        </ChartWrapper>
                    </Col>

                    {/* 右侧：学科走势 */}
                    <Col xs={24} lg={14}>
                        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 16, fontWeight: 500 }}>各学科平均分变化</span>
                            <Space>
                                <small style={{ color: '#94a3b8' }}>点击图例隐藏/显示学科</small>
                            </Space>
                        </div>
                        <ChartWrapper height={320}>
                            <LineChart>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="exam_name" allowDuplicatedCategory={false} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                                <Legend />
                                {subjectData.subjects.map((sub: any, index: number) => (
                                    <Line
                                        key={sub.course_name}
                                        data={sub.trends}
                                        type="monotone"
                                        dataKey="average_score"
                                        name={sub.course_name}
                                        stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        animationDuration={1500}
                                    />
                                ))}
                            </LineChart>
                        </ChartWrapper>
                    </Col>
                </Row>
            </Card>
        );
    };

    return (
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <PageHeader
                title="班级学情分析"
                subtitle="Class Performance Analysis"
                extra={
                    <Space>
                        <Select
                            placeholder="选择班级"
                            value={selectedClassId}
                            onChange={setSelectedClassId}
                            style={{ width: 140 }}
                            options={classes.map((c: any) => ({ label: c.name, value: c.id.toString() }))}
                        />
                        <Select
                            placeholder="选择考试"
                            value={selectedExamId}
                            onChange={setSelectedExamId}
                            style={{ width: 180 }}
                            options={exams.map((e: any) => ({ label: e.name, value: e.id.toString() }))}
                            allowClear
                        />
                    </Space>
                }
            />

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Spin size="large" tip="正在分析数据..." />
                </div>
            ) : (
                <>
                    {/* 模块一：综合成绩与排名 */}
                    {renderComprehensiveModule()}

                    {/* 模块二：学科优劣势透视 */}
                    {renderSubjectModule()}
                </>
            )}

            {/* AI 分析摘要 */}
            <ClassAiReportCard
                classId={selectedClassId}
                examId={selectedExamId ? Number(selectedExamId) : 0}
            />
        </Space>
    );
}
