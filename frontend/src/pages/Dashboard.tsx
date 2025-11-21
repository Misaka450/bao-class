import { useState, useEffect } from 'react';
import { Card, Row, Col, Select, Statistic, Spin, message, List, Avatar } from 'antd';
import {
    TrophyOutlined,
    CheckCircleOutlined,
    StarOutlined,
    RiseOutlined,
    FallOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../store/authStore';

interface Stats {
    total_students: number;
    average_score: number;
    pass_rate: string;
    excellent_rate: string;
}

interface Distribution {
    range: string;
    count: number;
    [key: string]: any;
}

interface Student {
    id: number;
    name: string;
    student_number: string;
    average_score: number;
}

interface Class { id: number; name: string; }
interface Exam { id: number; name: string; class_id: number; courses?: any[] }
interface Course { id: number; name: string; }

export default function Dashboard() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);

    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    const [stats, setStats] = useState<Stats | null>(null);
    const [distribution, setDistribution] = useState<Distribution[]>([]);
    const [topStudents, setTopStudents] = useState<Student[]>([]);
    const [progress, setProgress] = useState<{ improved: any[], declined: any[] }>({ improved: [], declined: [] });
    const [loading, setLoading] = useState(false);

    const token = useAuthStore((state) => state.token);

    // Initial data fetch
    useEffect(() => {
        const initData = async () => {
            await fetchClasses();
            await fetchExams(); // Fetches all exams
            await fetchCourses(); // Fetches all courses
        };
        initData();
    }, []);

    // Filter exams when class changes
    const filteredExams = selectedClassId
        ? exams.filter(exam => exam.class_id.toString() === selectedClassId)
        : [];

    // Filter courses when exam changes and deduplicate
    const filteredCourses = selectedExamId
        ? (() => {
            const exam = exams.find(e => e.id.toString() === selectedExamId);
            const examCourses = exam?.courses?.map((c: any) => ({ id: c.course_id, name: c.course_name })) || courses;

            // Deduplicate courses based on ID
            const uniqueCourses = Array.from(new Map(examCourses.map((c: any) => [c.id, c])).values());
            return uniqueCourses as Course[];
        })()
        : courses;

    // Auto-select first exam when class changes
    useEffect(() => {
        if (filteredExams.length > 0) {
            // Only change if current selection is invalid or empty
            if (!selectedExamId || !filteredExams.find(e => e.id.toString() === selectedExamId)) {
                setSelectedExamId(filteredExams[0].id.toString());
            }
        } else {
            setSelectedExamId('');
        }
    }, [selectedClassId, exams]);

    // Auto-select first course when exam changes
    useEffect(() => {
        if (selectedExamId) {
            fetchDistribution();

            // Get valid courses for this exam
            const exam = exams.find(e => e.id.toString() === selectedExamId);
            const validCourses = exam?.courses?.map((c: any) => ({ id: c.course_id, name: c.course_name })) || courses;
            const uniqueValidCourses = Array.from(new Map(validCourses.map((c: any) => [c.id, c])).values()) as Course[];

            // Check if current selection is valid
            const isCurrentValid = selectedCourseId && uniqueValidCourses.some(c => c.id.toString() === selectedCourseId);

            if (!isCurrentValid) {
                if (uniqueValidCourses.length > 0) {
                    setSelectedCourseId(uniqueValidCourses[0].id.toString());
                } else {
                    setSelectedCourseId('');
                }
            }
        } else {
            setSelectedCourseId('');
        }
    }, [selectedExamId, exams, courses]);

    // Fetch data when filters change
    useEffect(() => {
        if (selectedClassId && selectedExamId) {
            fetchDashboardData();
        }
    }, [selectedClassId, selectedExamId, selectedCourseId]);

    const fetchClasses = async () => {
        try {
            const res = await fetch('http://localhost:8787/api/classes', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setClasses(data);
            if (data.length > 0) setSelectedClassId(data[0].id.toString());
        } catch (error) {
            message.error('获取班级失败');
        }
    };

    const fetchExams = async () => {
        try {
            const res = await fetch('http://localhost:8787/api/exams', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setExams(data);
        } catch (error) {
            message.error('获取考试失败');
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch('http://localhost:8787/api/courses', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setCourses(data);
        } catch (error) {
            message.error('获取课程失败');
        }
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchStats(),
                fetchDistribution(),
                fetchTopStudents(),
                fetchProgress()
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            let url = `http://localhost:8787/api/stats/class/${selectedClassId}?examId=${selectedExamId}`;
            if (selectedCourseId) url += `&courseId=${selectedCourseId}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(await res.json());
        } catch (error) {
            console.error(error);
        }
    };

    const fetchDistribution = async () => {
        try {
            let url = `http://localhost:8787/api/stats/exam/${selectedExamId}/distribution`;
            if (selectedCourseId) url += `?courseId=${selectedCourseId}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDistribution(await res.json());
        } catch (error) {
            console.error(error);
        }
    };

    const fetchTopStudents = async () => {
        try {
            let url = `http://localhost:8787/api/stats/exam/${selectedExamId}/top-students?limit=5`;
            if (selectedCourseId) url += `&courseId=${selectedCourseId}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTopStudents(await res.json());
        } catch (error) {
            console.error(error);
        }
    };

    const fetchProgress = async () => {
        try {
            let url = `http://localhost:8787/api/stats/exam/${selectedExamId}/progress`;
            if (selectedCourseId) url += `?courseId=${selectedCourseId}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProgress(await res.json());
        } catch (error) {
            console.error(error);
        }
    };

    const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

    const highestScore = topStudents.length > 0 ? topStudents[0].average_score : 0;

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>数据仪表盘</h2>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>综合数据分析与可视化</p>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={24} md={8}>
                        <div style={{ marginBottom: 8, color: '#666' }}>班级</div>
                        <Select
                            value={selectedClassId}
                            onChange={setSelectedClassId}
                            style={{ width: '100%' }}
                            placeholder="选择班级"
                        >
                            {classes.map((cls) => (
                                <Select.Option key={cls.id} value={cls.id.toString()}>{cls.name}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={24} md={8}>
                        <div style={{ marginBottom: 8, color: '#666' }}>考试</div>
                        <Select
                            value={selectedExamId}
                            onChange={setSelectedExamId}
                            style={{ width: '100%' }}
                            placeholder="选择考试"
                            disabled={!selectedClassId}
                        >
                            {filteredExams.map((exam) => (
                                <Select.Option key={exam.id} value={exam.id.toString()}>{exam.name}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={24} md={8}>
                        <div style={{ marginBottom: 8, color: '#666' }}>科目</div>
                        <Select
                            value={selectedCourseId}
                            onChange={setSelectedCourseId}
                            style={{ width: '100%' }}
                            placeholder="全部科目"
                            disabled={!selectedExamId}
                            allowClear
                        >
                            {filteredCourses.map((course) => (
                                <Select.Option key={course.id} value={course.id.toString()}>{course.name}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </Card>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
            ) : (
                <>
                    {/* Main Stats & Distribution */}
                    <Col span={24}>
                        <Row gutter={[24, 24]}>
                            <Col xs={24} sm={24} md={24} lg={16}>
                                <Card title="分数段分布" bodyStyle={{ height: 360 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={distribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <XAxis dataKey="range" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                            <Bar dataKey="count" name="人数" radius={[6, 6, 0, 0]}>
                                                {distribution.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                            </Col>
                            <Col xs={24} sm={24} md={24} lg={8}>
                                <Card title="核心指标" bodyStyle={{ height: 360, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                                    <Statistic
                                        title="最高分"
                                        value={highestScore}
                                        precision={1}
                                        valueStyle={{ color: '#10b981', fontSize: '2rem' }}
                                        prefix={<TrophyOutlined />}
                                    />
                                    <Statistic
                                        title="平均分"
                                        value={stats?.average_score}
                                        precision={1}
                                        valueStyle={{ color: '#3b82f6', fontSize: '2rem' }}
                                        prefix={<RiseOutlined />}
                                    />
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Statistic
                                                title="及格率"
                                                value={stats?.pass_rate}
                                                suffix="%"
                                                valueStyle={{ color: '#f59e0b', fontSize: '1.2rem' }}
                                                prefix={<CheckCircleOutlined />}
                                            />
                                        </Col>
                                        <Col span={12}>
                                            <Statistic
                                                title="优秀率"
                                                value={stats?.excellent_rate}
                                                suffix="%"
                                                valueStyle={{ color: '#8b5cf6', fontSize: '1.2rem' }}
                                                prefix={<StarOutlined />}
                                            />
                                        </Col>
                                    </Row>
                                </Card>
                            </Col>
                        </Row>
                    </Col>
                    <Col span={24}>
                        <Card title="优秀学生 (Top 5)" bodyStyle={{ padding: '0 12px' }}>
                            <List
                                itemLayout="horizontal"
                                dataSource={topStudents}
                                renderItem={(item, index) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={
                                                <Avatar style={{ backgroundColor: index < 3 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                                                    {index + 1}
                                                </Avatar>
                                            }
                                            title={<span style={{ fontWeight: 600 }}>{item.name}</span>}
                                            description={`学号: ${item.student_number}`}
                                        />
                                        <div style={{ fontWeight: 'bold', fontSize: 18, color: '#6366f1' }}>
                                            {Number(item.average_score).toFixed(1)}
                                        </div>
                                    </List.Item>
                                )}
                            />
                        </Card>
                    </Col>
                    <Col span={24}>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={24} md={12}>
                                <Card title="进步最大 (Top 5)" bodyStyle={{ padding: '0 12px' }}>
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={progress.improved}
                                        renderItem={(item, index) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    avatar={<Avatar style={{ backgroundColor: '#f59e0b', fontSize: 12 }}>{index + 1}</Avatar>}
                                                    title={item.student_name}
                                                    description={<span style={{ color: '#10b981', fontWeight: 500 }}><RiseOutlined /> +{Number(item.progress).toFixed(1)}</span>}
                                                />
                                            </List.Item>
                                        )}
                                    />
                                </Card>
                            </Col>
                            <Col xs={24} sm={24} md={12}>
                                <Card title="退步最大 (Top 5)" bodyStyle={{ padding: '0 12px' }}>
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={progress.declined}
                                        renderItem={(item, index) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    avatar={<Avatar style={{ backgroundColor: '#ef4444', fontSize: 12 }}>{index + 1}</Avatar>}
                                                    title={item.student_name}
                                                    description={<span style={{ color: '#ef4444', fontWeight: 500 }}><FallOutlined /> {Number(item.progress).toFixed(1)}</span>}
                                                />
                                            </List.Item>
                                        )}
                                    />
                                </Card>
                            </Col>
                        </Row>
                    </Col>
                </>
            )}
        </div>
    );
}
