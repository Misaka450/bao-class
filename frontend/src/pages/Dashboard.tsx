import { useState, useEffect } from 'react';
import { Card, Row, Col, Select, Statistic, Spin, message } from 'antd';
import {
    UserOutlined,
    TrophyOutlined,
    CheckCircleOutlined,
    StarOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
}

interface Class { id: number; name: string; }
interface Exam { id: number; name: string; course_id?: number; }
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
    const [loading, setLoading] = useState(false);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchClasses();
        fetchExams();
        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedClassId) fetchStats();
    }, [selectedClassId]);

    useEffect(() => {
        if (selectedExamId) fetchDistribution();
    }, [selectedExamId]);

    const filteredExams = selectedCourseId
        ? exams.filter(exam => exam.course_id?.toString() === selectedCourseId)
        : exams;

    useEffect(() => {
        if (filteredExams.length > 0 && !filteredExams.find(e => e.id.toString() === selectedExamId)) {
            setSelectedExamId(filteredExams[0].id.toString());
        }
    }, [selectedCourseId, filteredExams]);

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
            if (data.length > 0) setSelectedExamId(data[0].id.toString());
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
            if (data.length > 0) setSelectedCourseId(data[0].id.toString());
        } catch (error) {
            message.error('获取课程失败');
        }
    };

    const fetchStats = async () => {
        if (!selectedClassId) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:8787/api/stats/class/${selectedClassId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(await res.json());
        } catch (error) {
            message.error('获取统计失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchDistribution = async () => {
        if (!selectedExamId) return;
        try {
            const res = await fetch(`http://localhost:8787/api/stats/exam/${selectedExamId}/distribution`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDistribution(await res.json());
        } catch (error) {
            message.error('获取分布失败');
        }
    };

    const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>数据仪表盘</h2>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>综合数据分析与可视化</p>
            </div>

            <Card style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Select
                            value={selectedClassId}
                            onChange={setSelectedClassId}
                            style={{ width: '100%' }}
                            placeholder="选择班级"
                        >
                            {classes.map((cls) => (
                                <Select.Option key={cls.id} value={cls.id}>{cls.name}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={8}>
                        <Select
                            value={selectedCourseId}
                            onChange={setSelectedCourseId}
                            style={{ width: '100%' }}
                            placeholder="选择科目"
                        >
                            {courses.map((course) => (
                                <Select.Option key={course.id} value={course.id}>{course.name}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={8}>
                        <Select
                            value={selectedExamId}
                            onChange={setSelectedExamId}
                            style={{ width: '100%' }}
                            placeholder="选择考试"
                        >
                            {filteredExams.map((exam) => (
                                <Select.Option key={exam.id} value={exam.id}>{exam.name}</Select.Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </Card>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
            ) : stats && (
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="学生总数"
                                value={stats.total_students}
                                prefix={<UserOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="平均分"
                                value={Number(stats.average_score).toFixed(1)}
                                prefix={<TrophyOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="及格率"
                                value={stats.pass_rate}
                                suffix="%"
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="优秀率"
                                value={stats.excellent_rate}
                                suffix="%"
                                prefix={<StarOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            {distribution.length > 0 && (
                <Row gutter={16}>
                    <Col span={12}>
                        <Card title="成绩分布（柱状图）">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={distribution}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="range" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" fill="#667eea" name="人数" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card title="成绩分布（饼图）">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={distribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry: any) => `${entry.range}: ${entry.count}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="count"
                                    >
                                        {distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                </Row>
            )}
        </div>
    );
}
