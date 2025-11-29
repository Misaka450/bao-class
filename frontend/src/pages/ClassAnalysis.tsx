import { useState, useEffect } from 'react';
import { Card, Select, Spin, Typography, Row, Col, Empty, Tabs, Statistic } from 'antd';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts';
import { TrophyOutlined, RobotOutlined } from '@ant-design/icons';
import type { Class } from '../types';
import api from '../services/api';
import StudentAlertsCard from '../components/StudentAlertsCard';
import ExamQualityCard from '../components/ExamQualityCard';

const { Title } = Typography;

// Interfaces
interface ClassTrendData {
    class_name: string;
    trends: {
        exam_name: string;
        exam_date: string;
        average_score: number;
        pass_rate: number;
        excellent_rate: number;
    }[];
}

interface SubjectTrendData {
    class_name: string;
    subjects: {
        course_name: string;
        trends: {
            exam_name: string;
            exam_date: string;
            average_score: number;
            pass_rate: number;
        }[];
    }[];
}

interface GradeComparisonData {
    exam_info: {
        exam_name: string;
        exam_date: string;
    };
    classes: {
        class_id: number;
        class_name: string;
        average_score: number;
        student_count: number;
        rank: number;
    }[];
    current_class: {
        class_id: number;
        rank: number;
        rank_change: number;
    };
}

export default function ClassAnalysis() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(false);

    // Data states
    const [trendData, setTrendData] = useState<ClassTrendData | null>(null);
    const [subjectData, setSubjectData] = useState<SubjectTrendData | null>(null);
    const [gradeData, setGradeData] = useState<GradeComparisonData | null>(null);
    const [latestExamId, setLatestExamId] = useState<number | undefined>(undefined);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchData(activeTab);
            fetchLatestExam();
        }
    }, [selectedClassId, activeTab]);

    const fetchLatestExam = async () => {
        try {
            const result = await api.exam.list({ class_id: selectedClassId });
            if (result && result.length > 0) {
                setLatestExamId(result[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch latest exam', error);
        }
    };

    const fetchClasses = async () => {
        try {
            const data = await api.class.list();
            setClasses(data);
            if (data.length > 0) {
                setSelectedClassId(data[0].id.toString());
            }
        } catch (error) {
            // Error already handled in request layer
        }
    };

    const fetchData = async (tab: string) => {
        if (!selectedClassId) return;
        setLoading(true);
        try {
            if (tab === 'overview') {
                const data = await api.stats.getClassTrend(Number(selectedClassId));
                setTrendData(data as any);
            } else if (tab === 'subject') {
                const data = await api.stats.getClassSubjectTrend(Number(selectedClassId));
                setSubjectData(data as any);
            } else if (tab === 'grade') {
                // Grade comparison needs exam ID, using first available exam
                // This is a simplified approach - in real scenario, we'd need to select an exam
                const data = await api.stats.getGradeComparison(Number(selectedClassId), 1);
                setGradeData(data as any);
            }
        } catch (error) {
            // Error already handled in request layer
        } finally {
            setLoading(false);
        }
    };

    // Render functions for each tab
    const renderOverviewTab = () => (
        <Row gutter={[24, 24]}>
            <Col span={24}>
                <Card title="平均分走势" bordered={false}>
                    <div style={{ height: 350, minHeight: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
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
                        <ResponsiveContainer width="100%" height="100%">
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

        // Prepare data for radar chart (latest exam pass rates)
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
                            <ResponsiveContainer width="100%" height="100%">
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
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="exam_name" allowDuplicatedCategory={false} />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <Legend />
                                    {subjectData.subjects.map((sub, index) => (
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
                                    value={gradeData.classes.find(c => c.class_id === gradeData.current_class.class_id)?.average_score || 0}
                                    precision={1}
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>
                <Col span={24}>
                    <Card title="年级各班平均分对比" bordered={false}>
                        <div style={{ height: 400, minHeight: 400 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={gradeData.classes} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 'auto']} />
                                    <YAxis dataKey="class_name" type="category" width={100} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="average_score" name="平均总分" fill="#1890ff" barSize={30}>
                                        {gradeData.classes.map((entry, index) => (
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

    const renderAiTab = () => (
        <Row gutter={[24, 24]}>
            <Col xs={24} lg={14}>
                <StudentAlertsCard classId={Number(selectedClassId)} />
            </Col>
            <Col xs={24} lg={10}>
                <ExamQualityCard examId={latestExamId} />
            </Col>
        </Row>
    );

    const items = [
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
    ];

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>班级成绩走势</Title>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>多维度分析班级成绩表现与趋势</p>
                </div>
                <Select
                    value={selectedClassId}
                    onChange={setSelectedClassId}
                    style={{ width: 200 }}
                    placeholder="选择班级"
                >
                    {classes.map((cls) => (
                        <Select.Option key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                        </Select.Option>
                    ))}
                </Select>
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
