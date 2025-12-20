import { useState, useEffect, useMemo } from 'react';
import { Card, Select, Spin, Typography, Row, Col, Empty, Tabs, Statistic, Space } from 'antd';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts';
import { TrophyOutlined, RobotOutlined } from '@ant-design/icons';
import ClassAiReportCard from '../components/ClassAiReportCard';
import ExamQualityCard from '../components/ExamQualityCard';
import ScoreDistributionChart from '../components/ScoreDistributionChart';
import { useClassList } from '../hooks/useClassList';
import { useExamList } from '../hooks/useExamList';
import { useClassTrend, useClassSubjectTrend, useGradeComparison } from '../hooks/useClassAnalysis';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import ChartWrapper from '../components/ChartWrapper';
import StatisticsRow from '../components/StatisticsRow';

const { Title } = Typography;

export default function ClassAnalysis() {
    const { data: classes = [] } = useClassList();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [activeTab, setActiveTab] = useState('overview');
    const [distributionData, setDistributionData] = useState<any>(null);
    const [loadingDistribution, setLoadingDistribution] = useState(false);

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
    const renderOverviewTab = () => (
        <Row gutter={[24, 24]}>
            <Col span={24}>
                <Card title="平均分走势" bordered={false}>
                    <ChartWrapper>
                        <LineChart data={trendData?.trends || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="exam_name" />
                            <YAxis domain={[0, 'auto']} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="average_score" name="平均分" stroke="#1890ff" strokeWidth={3} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ChartWrapper>
                </Card>
            </Col>
            <Col span={24}>
                <Card title="及格率与优秀率走势 (%)" bordered={false}>
                    <ChartWrapper>
                        <AreaChart data={trendData?.trends || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="exam_name" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="pass_rate" name="及格率" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                            <Area type="monotone" dataKey="excellent_rate" name="优秀率" stackId="2" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                        </AreaChart>
                    </ChartWrapper>
                </Card>
            </Col>
        </Row>
    );

    const renderSubjectTab = () => {
        if (!subjectData?.subjects?.length) return <Empty description="暂无数据" />;

        const latestExamIndex = (subjectData.subjects[0]?.trends?.length || 0) - 1;
        const radarData = subjectData.subjects.map(sub => ({
            subject: sub.course_name,
            passRate: sub.trends[latestExamIndex]?.pass_rate || 0,
            fullMark: 100
        }));

        return (
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                    <Card title="各科目及格率对比 (最新考试)" bordered={false}>
                        <ChartWrapper>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                <Radar name="及格率" dataKey="passRate" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                <Tooltip />
                                <Legend />
                            </RadarChart>
                        </ChartWrapper>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="各科目平均分走势" bordered={false}>
                        <ChartWrapper>
                            <LineChart>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="exam_name" allowDuplicatedCategory={false} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                {subjectData.subjects.map((sub: any, index: number) => (
                                    <Line
                                        key={sub.course_name}
                                        data={sub.trends}
                                        type="monotone"
                                        dataKey="average_score"
                                        name={sub.course_name}
                                        stroke={['#8884d8', '#82ca9d', '#ffc658', '#ff7300'][index % 4]}
                                    />
                                ))}
                            </LineChart>
                        </ChartWrapper>
                    </Card>
                </Col>
            </Row>
        );
    };

    const renderGradeTab = () => {
        if (!gradeData) return <Empty description="暂无数据" />;

        return (
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Card bordered={false}>
                        <Row gutter={[24, 24]} align="middle">
                            <Col xs={24} sm={8}>
                                <Statistic
                                    title="当前考试"
                                    value={gradeData.exam_info.exam_name}
                                    valueStyle={{ fontSize: 18 }}
                                />
                            </Col>
                            <Col xs={12} sm={8}>
                                <Statistic
                                    title="年级排名"
                                    value={gradeData.current_class.rank}
                                    prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
                                    suffix={`/ ${gradeData.classes.length}`}
                                />
                            </Col>
                            <Col xs={12} sm={8}>
                                <Statistic
                                    title="平均分"
                                    value={gradeData.classes.find((c: any) => c.class_id === gradeData.current_class.class_id)?.average_score || 0}
                                    precision={1}
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>
                <Col span={24}>
                    <Card title="年级各班平均分对比" bordered={false}>
                        <ChartWrapper height={400}>
                            <BarChart data={gradeData.classes} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 'auto']} />
                                <YAxis dataKey="class_name" type="category" width={100} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="average_score" name="平均总分" fill="#1890ff" barSize={30}>
                                    {gradeData.classes.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.class_id === gradeData.current_class.class_id ? '#ff7300' : '#1890ff'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartWrapper>
                    </Card>
                </Col>
            </Row>
        );
    };

    // Fetch distribution data when exam changes
    useEffect(() => {
        const fetchDistribution = async () => {
            if (!selectedClassId || !selectedExamId) {
                setDistributionData(null);
                return;
            }

            setLoadingDistribution(true);
            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'https://api.980823.xyz/api'}/analysis/class/${selectedClassId}/exam/${selectedExamId}/distribution`,
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                const data = await response.json();
                setDistributionData(data);
            } catch (error) {
                console.error('Failed to fetch distribution:', error);
                setDistributionData(null);
            } finally {
                setLoadingDistribution(false);
            }
        };

        fetchDistribution();
    }, [selectedClassId, selectedExamId]);

    const renderAiTab = () => (
        <Row gutter={[24, 24]}>
            {/* 上半部分：图表概览 (考试质量 + 成绩分布) */}
            <Col xs={24} xl={12}>
                <ExamQualityCard examId={selectedExamId ? Number(selectedExamId) : undefined} />
            </Col>
            <Col xs={24} xl={12}>
                <Card title="各科成绩分布" bordered={false} style={{ height: '100%' }}>
                    <ScoreDistributionChart data={distributionData} loading={loadingDistribution} />
                </Card>
            </Col>

            {/* 下半部分：AI 智能报告 (通栏) */}
            <Col span={24}>
                <ClassAiReportCard classId={selectedClassId} examId={selectedExamId ? Number(selectedExamId) : undefined} />
            </Col>
        </Row>
    );

    const items = useMemo(() => [
        {
            key: 'overview',
            label: '综合走势',
            children: renderOverviewTab(),
        },
        {
            key: 'subject',
            label: '科目分析',
            children: renderSubjectTab(),
        },
        {
            key: 'grade',
            label: '年级对比',
            children: renderGradeTab(),
        },
        {
            key: 'ai',
            label: <span><RobotOutlined /> AI 智能分析</span>,
            children: renderAiTab(),
        },
    ], [selectedClassId, selectedExamId, trendData, subjectData, gradeData]);

    return (
        <div>
            <PageHeader
                title="班级成绩走势"
                subtitle="多维度分析班级成绩表现与趋势"
                extra={
                    <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Select
                            value={selectedClassId}
                            onChange={setSelectedClassId}
                            style={{ minWidth: 140, flex: 1 }}
                            placeholder="选择班级"
                        >
                            {classes.map((cls: any) => (
                                <Select.Option key={cls.id} value={cls.id.toString()}>
                                    {cls.name}
                                </Select.Option>
                            ))}
                        </Select>
                        <Select
                            value={selectedExamId}
                            onChange={setSelectedExamId}
                            style={{ minWidth: 180, flex: 1 }}
                            placeholder="选择考试"
                        >
                            {exams.map((exam: any) => (
                                <Select.Option key={exam.id} value={exam.id.toString()}>
                                    {exam.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Space>
                }
            />

            <Spin spinning={loading}>
                <Tabs
                    defaultActiveKey="overview"
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={items}
                    type="card"
                    style={{ background: '#fff', padding: '16px', borderRadius: '8px' }}
                    destroyInactiveTabPane
                />
            </Spin>
        </div>
    );
}
