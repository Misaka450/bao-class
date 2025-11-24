import { useState, useEffect } from 'react';
import { Card, Row, Col, Select, Statistic, Spin, List, Avatar } from 'antd';
import {
    TrophyOutlined,
    CheckCircleOutlined,
    StarOutlined,
    RiseOutlined,
    FallOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type {
    Stats,
    Distribution,
    TopStudent,
    ProgressData,
    Class,
    Exam,
    Course,
} from '../types';
import api from '../services/api';

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [distribution, setDistribution] = useState<Distribution[]>([]);
    const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
    const [progress, setProgress] = useState<ProgressData>({ improved: [], declined: [] });
    const [loading, setLoading] = useState(false);

    const [classes, setClasses] = useState<Class[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);

    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    // Fetch initial data (Classes)
    useEffect(() => {
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
        fetchClasses();
    }, []);

    // Fetch Exams when Class changes
    useEffect(() => {
        const fetchExams = async () => {
            if (!selectedClassId) return;
            try {
                const data = await api.exam.list({ class_id: selectedClassId });
                // Filter exams for the selected class
                const classExams = data.filter((e: Exam) => e.class_id.toString() === selectedClassId);
                setExams(classExams);
                if (classExams.length > 0) {
                    setSelectedExamId(classExams[0].id.toString());
                } else {
                    setSelectedExamId('');
                    setStats(null);
                    setDistribution([]);
                    setTopStudents([]);
                    setProgress({ improved: [], declined: [] });
                }
            } catch (error) {
                // Error already handled in request layer
            }
        };
        fetchExams();
    }, [selectedClassId]);

    // Update Courses when Exam changes
    useEffect(() => {
        if (!selectedExamId) {
            setCourses([]);
            setSelectedCourseId('');
            return;
        }
        const exam = exams.find(e => e.id.toString() === selectedExamId);
        if (exam) {
            const examCourses = exam.courses?.map(c => ({ id: c.course_id, name: c.course_name })) || [];
            setCourses(examCourses);
            // 不默认选择科目，保持为空以显示全部科目（总分）
            setSelectedCourseId('');
        }
    }, [selectedExamId, exams]);

    // Fetch Dashboard Data
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!selectedExamId) return;

            setLoading(true);
            try {
                // 1. Distribution
                const distData = await api.stats.getDistribution(
                    selectedExamId,
                    selectedCourseId || undefined
                );
                setDistribution(Array.isArray(distData) ? distData : []);

                // 2. Stats
                const statsData = await api.stats.getClassStats(selectedClassId, {
                    examId: selectedExamId,
                    courseId: selectedCourseId || undefined,
                });
                setStats(statsData);

                // 3. Top Students
                const topData = await api.stats.getTopStudents(selectedExamId, {
                    limit: 5,
                    courseId: selectedCourseId || undefined,
                });
                setTopStudents(topData);

                // 4. Progress
                const progressData = await api.stats.getProgress(
                    selectedExamId,
                    selectedCourseId || undefined
                );
                setProgress(progressData);
            } catch (error) {
                // Error already handled in request layer
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [selectedExamId, selectedCourseId, selectedClassId]);

    const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
    const highestScore = topStudents.length > 0 ? topStudents[0].average_score : 0;

    // Filtered lists for Selects (already handled by state updates, but for safety)
    const filteredExams = exams;
    const filteredCourses = courses;

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
                                    <div style={{ width: '100%', height: '100%', minHeight: 300 }}>
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
                                    </div>
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

                    {/* Student Stats Row */}
                    <Col span={24} style={{ marginTop: 24 }}>
                        <Row gutter={[24, 24]}>
                            {/* Top 5 Students */}
                            <Col xs={24} md={8}>
                                <Card title="优秀学生 (Top 5)" bodyStyle={{ padding: '0 12px' }}>
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={topStudents}
                                        renderItem={(item, index) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    avatar={<Avatar style={{ backgroundColor: index < 3 ? '#f56a00' : '#7265e6' }}>{index + 1}</Avatar>}
                                                    title={item.name}
                                                />
                                                <div style={{ fontWeight: 'bold', color: '#10b981' }}>{item.average_score}分</div>
                                            </List.Item>
                                        )}
                                    />
                                </Card>
                            </Col>

                            {/* Most Improved */}
                            <Col xs={24} md={8}>
                                <Card title="进步最大 (Top 5)" bodyStyle={{ padding: '0 12px' }}>
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={progress.improved.slice(0, 5)}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    avatar={<Avatar style={{ backgroundColor: '#87d068' }} icon={<RiseOutlined />} />}
                                                    title={item.student_name}
                                                />
                                                <div style={{ fontWeight: 'bold', color: '#10b981' }}>+{item.progress}</div>
                                            </List.Item>
                                        )}
                                    />
                                </Card>
                            </Col>

                            {/* Biggest Decline */}
                            <Col xs={24} md={8}>
                                <Card title="退步最大 (Top 5)" bodyStyle={{ padding: '0 12px' }}>
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={progress.declined.slice(0, 5)}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    avatar={<Avatar style={{ backgroundColor: '#ff4d4f' }} icon={<FallOutlined />} />}
                                                    title={item.student_name}
                                                />
                                                <div style={{ fontWeight: 'bold', color: '#ff4d4f' }}>{item.progress}</div>
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
