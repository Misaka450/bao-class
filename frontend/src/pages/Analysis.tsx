import { useState, useEffect } from 'react';
import { Card, Select, Button, Typography, message, List, Row, Col } from 'antd';
import { BulbOutlined, UserOutlined, TeamOutlined, WarningOutlined, FallOutlined, RiseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Paragraph, Text } = Typography;

interface Class { id: number; name: string; }
interface Student { id: number; name: string; }
interface FocusGroupData {
    critical: { id: number; name: string; type: string; score: number; subject: string }[];
    regressing: { id: number; name: string; type: string; drop_amount: number }[];
    fluctuating: { id: number; name: string; type: string; score_diff: number }[];
}

export default function Analysis() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [classSummary, setClassSummary] = useState<string>('');
    const [studentAdvice, setStudentAdvice] = useState<string>('');
    const [focusGroup, setFocusGroup] = useState<FocusGroupData | null>(null);
    const token = useAuthStore((state) => state.token);
    const navigate = useNavigate();

    useEffect(() => {
        fetchClasses();
        fetchStudents();
    }, []);

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

    const fetchStudents = async () => {
        try {
            const res = await fetch('http://localhost:8787/api/students', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setStudents(data);
            if (data.length > 0) setSelectedStudentId(data[0].id.toString());
        } catch (error) {
            message.error('获取学生失败');
        }
    };

    const handleClassSummary = async () => {
        if (!selectedClassId) return;
        setLoading(true);
        setClassSummary('');
        try {
            const res = await fetch(`http://localhost:8787/api/analysis/class/${selectedClassId}/summary`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setClassSummary(data.summary || '暂无数据');
        } catch (error) {
            message.error('生成失败');
        } finally {
            setLoading(false);
        }
    };

    const handleStudentAdvice = async () => {
        if (!selectedStudentId) return;
        setLoading(true);
        setStudentAdvice('');
        try {
            const res = await fetch(`http://localhost:8787/api/analysis/student/${selectedStudentId}/advice`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setStudentAdvice(data.advice || '暂无数据');
        } catch (error) {
            message.error('生成失败');
        } finally {
            setLoading(false);
        }
    };

    const handleFocusAnalysis = async () => {
        if (!selectedClassId) return;
        setLoading(true);
        setFocusGroup(null);
        try {
            const res = await fetch(`http://localhost:8787/api/analysis/class/focus/${selectedClassId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setFocusGroup(data);
        } catch (error) {
            message.error('生成失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>AI 智能分析</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>基于 AI 的成绩分析与学习建议</p>
                </div>
                <div>
                    <Button onClick={() => navigate('/analysis/subject')} style={{ marginRight: 8 }}>
                        学生学科分析
                    </Button>
                    <Button onClick={() => navigate('/analysis/comparison')}>
                        学科横向对比
                    </Button>
                </div>
            </div>

            <Card
                title={<><TeamOutlined /> 班级成绩总结</>}
                style={{ marginBottom: 16 }}
                extra={
                    <Select
                        value={selectedClassId}
                        onChange={setSelectedClassId}
                        style={{ width: 200 }}
                    >
                        {classes.map((cls) => (
                            <Select.Option key={cls.id} value={cls.id.toString()}>{cls.name}</Select.Option>
                        ))}
                    </Select>
                }
            >
                <Button
                    type="primary"
                    icon={<BulbOutlined />}
                    onClick={handleClassSummary}
                    loading={loading}
                    style={{ marginBottom: 16 }}
                >
                    生成班级分析
                </Button>
                {classSummary && (
                    <Card type="inner" style={{ background: '#f9fafb' }}>
                        <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                            {classSummary}
                        </Paragraph>
                    </Card>
                )}
            </Card>

            <Card
                title={<><TeamOutlined /> 重点关注群体分析</>}
                style={{ marginBottom: 16 }}
            >
                <Button
                    type="primary"
                    icon={<TeamOutlined />}
                    onClick={handleFocusAnalysis}
                    loading={loading}
                    style={{ marginBottom: 16 }}
                >
                    识别重点群体
                </Button>

                {focusGroup && (
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                            <Card type="inner" title={<><WarningOutlined style={{ color: '#faad14' }} /> 临界生 (Critical)</>} size="small">
                                <List
                                    dataSource={focusGroup.critical}
                                    renderItem={item => (
                                        <List.Item>
                                            <List.Item.Meta
                                                title={item.name}
                                                description={
                                                    <span>
                                                        {item.subject}: <Text strong>{item.score}</Text>
                                                    </span>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                    locale={{ emptyText: '暂无临界生' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card type="inner" title={<><FallOutlined style={{ color: '#ff4d4f' }} /> 退步生 (Regressing)</>} size="small">
                                <List
                                    dataSource={focusGroup.regressing}
                                    renderItem={item => (
                                        <List.Item>
                                            <List.Item.Meta
                                                title={item.name}
                                                description={
                                                    <span>
                                                        平均分下降: <Text type="danger">{item.drop_amount.toFixed(1)}</Text>
                                                    </span>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                    locale={{ emptyText: '暂无明显退步' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card type="inner" title={<><RiseOutlined style={{ color: '#1890ff' }} /> 波动生 (Fluctuating)</>} size="small">
                                <List
                                    dataSource={focusGroup.fluctuating}
                                    renderItem={item => (
                                        <List.Item>
                                            <List.Item.Meta
                                                title={item.name}
                                                description={
                                                    <span>
                                                        极差: <Text type="secondary">{item.score_diff}</Text>
                                                    </span>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                    locale={{ emptyText: '暂无剧烈波动' }}
                                />
                            </Card>
                        </Col>
                    </Row>
                )}
            </Card>

            <Card
                title={<><UserOutlined /> 学生个性化建议</>}
                style={{ marginBottom: 16 }}
                extra={
                    <Select
                        value={selectedStudentId}
                        onChange={setSelectedStudentId}
                        style={{ width: 200 }}
                    >
                        {students.map((student) => (
                            <Select.Option key={student.id} value={student.id.toString()}>
                                {student.name}
                            </Select.Option>
                        ))}
                    </Select>
                }
            >
                <Button
                    type="primary"
                    icon={<BulbOutlined />}
                    onClick={handleStudentAdvice}
                    loading={loading}
                    style={{ marginBottom: 16 }}
                >
                    生成学习建议
                </Button>
                {studentAdvice && (
                    <Card type="inner" style={{ background: '#f9fafb' }}>
                        <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                            {studentAdvice}
                        </Paragraph>
                    </Card>
                )}
            </Card>
        </div >
    );
}
