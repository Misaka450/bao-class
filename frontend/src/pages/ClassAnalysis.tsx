import { useState, useEffect, useMemo } from 'react';
import { Card, Select, Spin, Typography, Row, Col, Empty, Tabs, Statistic, Space } from 'antd';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts';
import { TrophyOutlined, RobotOutlined } from '@ant-design/icons';
import ClassAiReportCard from '../components/ClassAiReportCard';
import ExamQualityCard from '../components/ExamQualityCard';
import HeatmapChart from '../components/HeatmapChart';
import { useClassList } from '../hooks/useClassList';
import { useExamList } from '../hooks/useExamList';
import { useClassTrend, useClassSubjectTrend, useGradeComparison } from '../hooks/useClassAnalysis';
import api from '../services/api';

const { Title } = Typography;

export default function ClassAnalysis() {
    const { data: classes = [] } = useClassList();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [activeTab, setActiveTab] = useState('overview');
    const [heatmapData, setHeatmapData] = useState<any>(null);
    const [loadingHeatmap, setLoadingHeatmap] = useState(false);

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
                    <div style={{ height: 350, minHeight: 350 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <LineChart data={trendData?.trends || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="exam_name" />
                                <YAxis domain={[0, 'auto']} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="average_score" name="平均分" stroke="#1890ff" strokeWidth={3} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </Col>
            <Col span={24}>
                <Card title="及格率与优秀率走势 (%)" bordered={false}>
                    <div style={{ height: 350, minHeight: 350 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={trendData?.trends || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="exam_name" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="pass_rate" name="及格率" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                                <Area type="monotone" dataKey="excellent_rate" name="优秀率" stackId="2" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
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
                        <div style={{ height: 350, minHeight: 350 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                    <Radar name="及格率" dataKey="passRate" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                    <Tooltip />
                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="各科目平均分走势" bordered={false}>
                        <div style={{ height: 350, minHeight: 350 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                            </ResponsiveContainer>
                        </div>
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
                        <Row gutter={24} align="middle">
                            <Col span={8}>
                                <Statistic
                                    title="当前考试"
                                    value={gradeData.exam_info.exam_name}
                                    valueStyle={{ fontSize: 20 }}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="年级排名"
                                    value={gradeData.current_class.rank}
                                    prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
                                    suffix={`/ ${gradeData.classes.length}`}
                                />
                            </Col>
                            <Col span={8}>
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
                        <div style={{ height: 400, minHeight: 400 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>
        );
    };

    // Fetch heatmap data when exam changes
    useEffect(() => {
        const fetchHeatmap = async () => {
            if (!selectedClassId || !selectedExamId) {
                setHeatmapData(null);
                return;
            }

            setLoadingHeatmap(true);
            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'https://api.980823.xyz/api'}/analysis/class/${selectedClassId}/exam/${selectedExamId}/heatmap`,
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                const data = await response.json();
                setHeatmapData(data);
            } catch (error) {
                console.error('Failed to fetch heatmap:', error);
                setHeatmapData(null);
            } finally {
                setLoadingHeatmap(false);
            }
        };

        fetchHeatmap();
    }, [selectedClassId, selectedExamId]);

    const renderAiTab = () => (
        <Row gutter={[24, 24]}>
            {/* 左侧：考试质量 + AI报告 */}
            <Col xs={24} xl={12}>
                <Row gutter={[24, 24]}>
                    <Col span={24}>
                        <ExamQualityCard examId={selectedExamId ? Number(selectedExamId) : undefined} />
                    </Col>
                    <Col span={24}>
                        <ClassAiReportCard classId={selectedClassId} examId={selectedExamId ? Number(selectedExamId) : undefined} />
                    </Col>
                </Row>
            </Col>

            {/* 右侧：热力图 */}
            <Col xs={24} xl={12}>
                {loadingHeatmap ? (
                    <Card style={{ height: '100%', minHeight: 600 }}>
                        <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
                    </Card>
                ) : (
                    <div style={{ position: 'sticky', top: 24 }}>
                        <HeatmapChart data={heatmapData} />
                    </div>
                )}
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
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>班级成绩走势</Title>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>多维度分析班级成绩表现与趋势</p>
                </div>
                <Space>
                    <Select
                        value={selectedClassId}
                        onChange={setSelectedClassId}
                        style={{ width: 160 }}
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
                        style={{ width: 220 }}
                        placeholder="选择考试"
                        loading={exams.length === 0 && !!selectedClassId}
                    >
                        {exams.map((exam: any) => (
                            <Select.Option key={exam.id} value={exam.id.toString()}>
                                {exam.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Space>
            </div>

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
