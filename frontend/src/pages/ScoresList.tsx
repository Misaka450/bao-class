import { useState, useEffect } from 'react';
import { Table, Card, Select, Row, Col, message, Spin } from 'antd';
import { TableOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../store/authStore';

interface ScoreData {
    student_id: number;
    student_name: string;
    student_number: string;
    class_name: string;
    scores: { [key: string]: number };
    total: number;
}

interface Class {
    id: number;
    name: string;
}

interface Exam {
    id: number;
    name: string;
    class_name?: string;
}

interface Course {
    id: number;
    name: string;
}

export default function ScoresList() {
    const [scoresData, setScoresData] = useState<ScoreData[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [subjects, setSubjects] = useState<string[]>([]);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchClasses();
        fetchExams();
        fetchCourses();
    }, []);

    useEffect(() => {
        fetchScoresData();
    }, [selectedClassId, selectedExamId, selectedCourseId]);

    const fetchClasses = async () => {
        try {
            const res = await fetch('http://localhost:8787/api/classes', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setClasses(data);
        } catch (error) {
            message.error('获取班级列表失败');
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
            message.error('获取考试列表失败');
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch('http://localhost:8787/api/courses', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            // 去重课程（根据课程名称）
            const uniqueCourses = data.reduce((acc: Course[], course: Course) => {
                if (!acc.find(c => c.name === course.name)) {
                    acc.push(course);
                }
                return acc;
            }, []);
            setCourses(uniqueCourses);
        } catch (error) {
            message.error('获取课程列表失败');
        }
    };

    const fetchScoresData = async () => {
        if (!selectedExamId) {
            setScoresData([]);
            return;
        }
        setLoading(true);
        try {
            let url = 'http://localhost:8787/api/stats/scores-list';
            const params = new URLSearchParams();
            if (selectedClassId) params.append('classId', selectedClassId);
            if (selectedExamId) params.append('examId', selectedExamId);
            if (selectedCourseId) params.append('courseId', selectedCourseId);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data: ScoreData[] = await res.json();
            setScoresData(data);

            // Extract unique subjects
            const subjectsSet = new Set<string>();
            data.forEach(student => {
                Object.keys(student.scores).forEach(subject => subjectsSet.add(subject));
            });
            setSubjects(Array.from(subjectsSet).sort());
        } catch (error) {
            message.error('获取成绩数据失败');
        } finally {
            setLoading(false);
        }
    };

    // Build dynamic columns
    const columns: ColumnsType<ScoreData> = [
        {
            title: '排名',
            key: 'rank',
            width: 50,
            render: (_: any, __: any, index: number) => index + 1,
        },
        {
            title: '学号',
            dataIndex: 'student_number',
            key: 'student_number',
            width: 90,
        },
        {
            title: '姓名',
            dataIndex: 'student_name',
            key: 'student_name',
            width: 80,
        },
        {
            title: '班级',
            dataIndex: 'class_name',
            key: 'class_name',
            width: 90,
        },
        // Dynamic subject columns
        ...subjects.map(subject => ({
            title: subject,
            dataIndex: ['scores', subject],
            key: subject,
            width: 80,
            render: (score: number) => score || '-',
            sorter: (a: ScoreData, b: ScoreData) => {
                const scoreA = a.scores[subject] || 0;
                const scoreB = b.scores[subject] || 0;
                return scoreA - scoreB;
            },
        })),
        // Only show total column when not filtering by a single course
        ...(!selectedCourseId ? [{
            title: '总分',
            dataIndex: 'total',
            key: 'total',
            width: 70,
            render: (total: number) => <strong>{total}</strong>,
            sorter: (a: ScoreData, b: ScoreData) => a.total - b.total,
            defaultSortOrder: 'descend' as const,
        }] : []),
    ];

    const filteredExams = selectedClassId
        ? exams.filter(exam => exam.class_name === classes.find(c => c.id.toString() === selectedClassId)?.name)
        : exams;

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                    <TableOutlined style={{ marginRight: 8 }} />
                    成绩清单
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                    查看所有学生的各科成绩，支持三层筛选和排序
                </p>
            </div>

            <Card style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col span={6}>
                        <Select
                            value={selectedClassId}
                            onChange={(val) => {
                                setSelectedClassId(val);
                                setSelectedExamId(''); // Reset exam when class changes
                            }}
                            style={{ width: '100%' }}
                            placeholder="全部班级"
                            allowClear
                        >
                            {classes.map((cls) => (
                                <Select.Option key={cls.id} value={cls.id.toString()}>
                                    {cls.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={6}>
                        <Select
                            value={selectedExamId}
                            onChange={setSelectedExamId}
                            style={{ width: '100%' }}
                            placeholder="全部考试"
                            allowClear
                        >
                            {filteredExams.map((exam) => (
                                <Select.Option key={exam.id} value={exam.id.toString()}>
                                    {exam.name} - {exam.class_name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={6}>
                        <Select
                            value={selectedCourseId}
                            onChange={setSelectedCourseId}
                            style={{ width: '100%' }}
                            placeholder="全部科目"
                            allowClear
                        >

                            {courses.map((course) => (
                                <Select.Option key={course.id} value={course.id.toString()}>
                                    {course.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </Card>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spin size="large" />
                </div>
            ) : (
                <Card>
                    <Table
                        columns={columns}
                        dataSource={scoresData}
                        rowKey="student_id"
                        loading={loading}
                        scroll={{ y: 600 }}
                        pagination={{
                            pageSize: 20,
                            showTotal: (total) => `共 ${total} 名学生`,
                            showSizeChanger: true,
                            pageSizeOptions: ['20', '50', '100'],
                        }}
                    />
                </Card>
            )}
        </div>
    );
}
