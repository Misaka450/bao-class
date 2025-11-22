import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Table, Tag, Spin, message, Statistic, Button } from 'antd';
import { ArrowLeftOutlined, RiseOutlined, FallOutlined, WarningOutlined } from '@ant-design/icons';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config';

const { Title, Text } = Typography;

interface StudentProfileData {
    student: {
        id: number;
        name: string;
        student_id: string;
        class_name: string;
    };
    history: {
        exam_id: number;
        exam_name: string;
        exam_date: string;
        total_score: number;
        class_rank: number;
        class_avg: number;
        total_students: number;
        subjects?: {
            subject: string;
            score: number;
            class_avg: number;
            class_rank: number;
        }[];
    }[];
    radar: {
        subject: string;
        score: number;
        classAvg: number;
        zScore: number;
        fullMark: number;
    }[];
    weak_subjects: {
        subject: string;
        score: number;
        zScore: number;
        reason: string;
    }[];
}

export default function StudentProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<StudentProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        if (id) {
            fetchProfile(id);
        }
    }, [id]);

    const fetchProfile = async (studentId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/stats/profile/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch profile');
            const json = await res.json();
            setData(json);
        } catch (error) {
            message.error('获取学生档案失败');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
    if (!data) return <div style={{ textAlign: 'center', marginTop: 100 }}>未找到学生数据</div>;

    // Calculate trends
    const latestRank = data.history.length > 0 ? data.history[data.history.length - 1].class_rank : '-';
    const prevRank = data.history.length > 1 ? data.history[data.history.length - 2].class_rank : null;
    const rankDiff = prevRank !== null ? (prevRank as number) - (latestRank as number) : 0; // Positive means improved (rank number got smaller)

    const bestSubject = data.radar.length > 0
        ? [...data.radar].sort((a, b) => b.zScore - a.zScore)[0]
        : null;

    const columns = [
        { title: '考试名称', dataIndex: 'exam_name', key: 'exam_name' },
        { title: '日期', dataIndex: 'exam_date', key: 'exam_date' },
        { title: '总分', dataIndex: 'total_score', key: 'total_score', render: (val: number) => val.toFixed(1) },
        { title: '班级平均分', dataIndex: 'class_avg', key: 'class_avg' },
        {
            title: '班级排名',
            dataIndex: 'class_rank',
            key: 'class_rank',
            render: (rank: number, record: any) => (
                <span>
                    {rank} / {record.total_students}
                </span>
            )
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
                <Title level={2} style={{ margin: 0 }}>学生全息档案</Title>
            </div>

            <Row gutter={[24, 24]}>
                {/* Basic Info Card */}
                <Col xs={24} md={8}>
                    <Card title="基本信息" bordered={false} style={{ height: '100%' }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ width: 80, height: 80, background: '#f0f2f5', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                                {data.student.name[0]}
                            </div>
                            <Title level={3}>{data.student.name}</Title>
                            <Text type="secondary">{data.student.class_name} | {data.student.student_id}</Text>
                        </div>
                        <Row gutter={16} style={{ textAlign: 'center' }}>
                            <Col span={12}>
                                <Statistic
                                    title="最新排名"
                                    value={latestRank}
                                    suffix={rankDiff !== 0 && (
                                        <span style={{ color: rankDiff > 0 ? '#3f8600' : '#cf1322', fontSize: 14 }}>
                                            {rankDiff > 0 ? <RiseOutlined /> : <FallOutlined />} {Math.abs(rankDiff)}
                                        </span>
                                    )}
                                />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="优势学科"
                                    value={bestSubject ? bestSubject.subject : '-'}
                                    valueStyle={{ fontSize: 18 }}
                                />
                            </Col>
                        </Row>

                        {data.weak_subjects.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <Text strong><WarningOutlined style={{ color: '#faad14' }} /> 需关注学科:</Text>
                                <div style={{ marginTop: 8 }}>
                                    {data.weak_subjects.map(ws => (
                                        <Tag color="warning" key={ws.subject} style={{ marginBottom: 8 }}>
                                            {ws.subject} ({ws.reason})
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </Col>

                {/* Charts */}
                <Col xs={24} md={16}>
                    <Row gutter={[24, 24]}>
                        <Col span={24}>
                            <Card title="排名走势 (数值越小越好)" bordered={false}>
                                <div style={{ height: 250 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.history}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="exam_name" />
                                            <YAxis reversed allowDecimals={false} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="class_rank" stroke="#1890ff" name="班级排名" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                        <Col span={24}>
                            <Card title="学科能力雷达 (Z-Score)" bordered={false}>
                                <div style={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.radar}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="subject" />
                                            <PolarRadiusAxis angle={30} domain={[-3, 3]} />
                                            <Radar name="个人表现" dataKey="zScore" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                            <Tooltip />
                                            <Legend />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </Col>

                {/* History Table */}
                <Col span={24}>
                    <Card title="历史考试记录" bordered={false}>
                        <Table
                            dataSource={data.history}
                            columns={columns}
                            rowKey="exam_id"
                            pagination={false}
                            size="middle"
                            expandable={{
                                expandedRowRender: (record) => (
                                    <div style={{ margin: 0 }}>
                                        <Table
                                            dataSource={record.subjects}
                                            columns={[
                                                { title: '学科', dataIndex: 'subject', key: 'subject' },
                                                { title: '我的分数', dataIndex: 'score', key: 'score' },
                                                { title: '班级排名', dataIndex: 'class_rank', key: 'class_rank' },
                                                { title: '班级平均分', dataIndex: 'class_avg', key: 'class_avg' },
                                                {
                                                    title: '对比',
                                                    key: 'diff',
                                                    render: (_, sub) => {
                                                        const diff = sub.score - sub.class_avg;
                                                        return (
                                                            <span style={{ color: diff >= 0 ? '#3f8600' : '#cf1322' }}>
                                                                {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                                                            </span>
                                                        );
                                                    }
                                                },
                                            ]}
                                            pagination={false}
                                            size="small"
                                            rowKey="subject"
                                        />
                                    </div>
                                ),
                                rowExpandable: (record) => !!(record.subjects && record.subjects.length > 0),
                            }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
