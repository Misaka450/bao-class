import { useState, useEffect } from 'react';
import { Card, Select, Button, Spin, Typography, message, Divider } from 'antd';
import { BulbOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

const { Paragraph } = Typography;

interface Class { id: number; name: string; }
interface Student { id: number; name: string; }

export default function Analysis() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [classSummary, setClassSummary] = useState<string>('');
    const [studentAdvice, setStudentAdvice] = useState<string>('');
    const [weakStudents, setWeakStudents] = useState<string>('');
    const token = useAuthStore((state) => state.token);

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

    const handleWeakStudents = async () => {
        if (!selectedClassId) return;
        setLoading(true);
        setWeakStudents('');
        try {
            const res = await fetch(`http://localhost:8787/api/analysis/class/${selectedClassId}/weak-students`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setWeakStudents(data.analysis || '暂无数据');
        } catch (error) {
            message.error('生成失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>AI 智能分析</h2>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>基于 AI 的成绩分析与学习建议</p>
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
                            <Select.Option key={cls.id} value={cls.id}>{cls.name}</Select.Option>
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
                title={<><UserOutlined /> 学生个性化建议</>}
                style={{ marginBottom: 16 }}
                extra={
                    <Select
                        value={selectedStudentId}
                        onChange={setSelectedStudentId}
                        style={{ width: 200 }}
                    >
                        {students.map((student) => (
                            <Select.Option key={student.id} value={student.id}>
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

            <Card title={<><TeamOutlined /> 薄弱学生群体识别</>}>
                <Button
                    type="primary"
                    icon={<BulbOutlined />}
                    onClick={handleWeakStudents}
                    loading={loading}
                    style={{ marginBottom: 16 }}
                >
                    识别薄弱群体
                </Button>
                {weakStudents && (
                    <Card type="inner" style={{ background: '#f9fafb' }}>
                        <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                            {weakStudents}
                        </Paragraph>
                    </Card>
                )}
            </Card>
        </div>
    );
}
