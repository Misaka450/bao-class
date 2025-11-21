import { useEffect, useState } from 'react';
import { message, Card, Select, Table, Button, InputNumber, Row, Col, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

interface ExamCourse {
    course_id: number;
    course_name: string;
    full_score: number;
}

interface Exam {
    id: number;
    name: string;
    class_id: number;
    class_name: string;
    courses: ExamCourse[];
}

interface StudentScore {
    student_id: number;
    name: string;
    student_code: string;
    course_id: number;
    course_name: string;
    score: number | null;
    score_id: number | null;
}

export default function ScoreEntry() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [students, setStudents] = useState<StudentScore[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const token = useAuthStore((state) => state.token);

    const selectedExam = exams.find(e => e.id.toString() === selectedExamId);

    useEffect(() => {
        fetchExams();
    }, []);

    useEffect(() => {
        if (selectedExamId && selectedCourseId) {
            fetchScores();
        } else {
            setStudents([]);
        }
    }, [selectedExamId, selectedCourseId]);

    const fetchExams = async () => {
        try {
            const res = await fetch('http://localhost:8787/api/exams', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setExams(data);
        } catch (error) {
            message.error('获取考试列表失败');
        }
    };

    const fetchScores = async () => {
        if (!selectedExam) return;

        setLoading(true);
        try {
            const res = await fetch(
                `http://localhost:8787/api/scores?exam_id=${selectedExamId}&class_id=${selectedExam.class_id}&course_id=${selectedCourseId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            setStudents(data);
        } catch (error) {
            message.error('获取成绩数据失败');
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (studentId: number, value: number | null) => {
        setStudents(students.map(s =>
            s.student_id === studentId ? { ...s, score: value } : s
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const scoresToSave = students
                .filter(s => s.score !== null)
                .map(s => ({
                    student_id: s.student_id,
                    score: s.score
                }));

            await fetch('http://localhost:8787/api/scores/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    exam_id: Number(selectedExamId),
                    course_id: Number(selectedCourseId),
                    scores: scoresToSave
                }),
            });

            message.success('成绩保存成功！');
            fetchScores();
        } catch (error) {
            message.error('保存失败，请重试');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            title: '学号',
            dataIndex: 'student_code',
            key: 'student_code',
            width: 120,
        },
        {
            title: '姓名',
            dataIndex: 'name',
            key: 'name',
            width: 120,
        },
        {
            title: '分数',
            dataIndex: 'score',
            key: 'score',
            width: 120,
            render: (_: any, record: StudentScore) => (
                <InputNumber
                    min={0}
                    max={selectedExam?.courses.find(c => c.course_id.toString() === selectedCourseId)?.full_score || 100}
                    step={0.5}
                    value={record.score}
                    onChange={(value) => handleScoreChange(record.student_id, value)}
                    placeholder="-"
                    style={{ width: '100%' }}
                />
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>成绩录入</h2>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                    批量录入班级考试成绩（选择考试和科目后开始录入）
                </p>
            </div>

            <Card style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col span={12}>
                        <div style={{ marginBottom: 8, fontWeight: 500 }}>选择考试</div>
                        <Select
                            value={selectedExamId}
                            onChange={(value) => {
                                setSelectedExamId(value);
                                setSelectedCourseId(''); // 重置科目选择
                            }}
                            style={{ width: '100%' }}
                            placeholder="请选择考试"
                            allowClear
                        >
                            {exams.map((exam) => (
                                <Select.Option key={exam.id} value={exam.id.toString()}>
                                    {exam.name} - {exam.class_name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={12}>
                        <div style={{ marginBottom: 8, fontWeight: 500 }}>选择科目</div>
                        <Select
                            value={selectedCourseId}
                            onChange={setSelectedCourseId}
                            style={{ width: '100%' }}
                            placeholder={selectedExamId ? "请选择科目" : "请先选择考试"}
                            disabled={!selectedExamId}
                            allowClear
                        >
                            {selectedExam?.courses.map((course) => (
                                <Select.Option key={course.course_id} value={course.course_id.toString()}>
                                    {course.course_name} (满分: {course.full_score})
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </Card>

            {selectedExamId && selectedCourseId ? (
                <Card>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 60 }}>
                            <Spin size="large" />
                            <p style={{ marginTop: 16, color: '#666' }}>加载学生成绩...</p>
                        </div>
                    ) : (
                        <>
                            <Table
                                columns={columns}
                                dataSource={students}
                                rowKey="student_id"
                                pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 名学生` }}
                                locale={{ emptyText: '该班级暂无学生' }}
                            />
                            <div style={{ marginTop: 16, textAlign: 'right' }}>
                                <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    onClick={handleSave}
                                    loading={saving}
                                    disabled={students.length === 0}
                                    size="large"
                                >
                                    保存成绩
                                </Button>
                            </div>
                        </>
                    )}
                </Card>
            ) : (
                <Card>
                    <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                        <p>请先选择考试和科目开始录入成绩</p>
                    </div>
                </Card>
            )}
        </div>
    );
}
