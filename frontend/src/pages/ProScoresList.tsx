import { useState, useMemo } from 'react';
import { Card, Select, Row, Col, message, Button, Space, Tag } from 'antd';
import { ProTable } from '@ant-design/pro-table';
import { TableOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-table';
import * as XLSX from 'xlsx';
import { useScoresList } from '../hooks/useScoresList';
import { useClassList } from '../hooks/useClassList';
import { useExamList } from '../hooks/useExamList';
import { useCourseList } from '../hooks/useCourseList';
import type { StudentScoreItem } from '../types';

interface Course {
    id: number;
    name: string;
}

export default function ProScoresList() {
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedExamName, setSelectedExamName] = useState<string>(''); // 改为按考试名称筛选
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    // Optimize: use React Query for all data fetching
    const { data: classes = [] } = useClassList();
    const { data: exams = [] } = useExamList();
    const { data: allCourses = [] } = useCourseList();
    const { data: scoresData = [], isLoading: loading } = useScoresList({
        classId: selectedClassId,
        examName: selectedExamName,
        courseId: selectedCourseId
    });

    // 去重课程（根据课程名称）
    const courses = useMemo(() => {
        return allCourses.reduce((acc: Course[], course: Course) => {
            if (!acc.find(c => c.name === course.name)) {
                acc.push(course);
            }
            return acc;
        }, []);
    }, [allCourses]);

    // Optimize: memoize subjects extraction from scores data
    const subjects = useMemo(() => {
        const subjectsSet = new Set<string>();
        scoresData.forEach((student: StudentScoreItem) => {
            if (student.scores) {
                Object.keys(student.scores).forEach(subject => subjectsSet.add(subject));
            }
        });
        return Array.from(subjectsSet).sort();
    }, [scoresData]);

    // Optimize: memoize unique exam names
    const uniqueExamNames = useMemo(() =>
        Array.from(new Set(exams.map(e => e.name))).sort(),
        [exams]
    );

    const handleExport = () => {
        if (scoresData.length === 0) {
            message.warning('没有数据可导出');
            return;
        }

        const exportData = scoresData.map((student, index) => {
            const row: any = {
                '排名': index + 1,
                '学号': student.student_number,
                '姓名': student.student_name,
                '班级': student.class_name,
            };

            subjects.forEach(subject => {
                row[subject] = student.scores[subject] || '-';
            });

            if (!selectedCourseId) {
                row['总分'] = student.total;
            }

            return row;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '成绩清单');

        const className = selectedClassId
            ? classes.find(c => c.id.toString() === selectedClassId)?.name || '全部班级'
            : '全部班级';
        const examName = selectedExamName || '所有考试';
        const fileName = `${className}_${examName}_成绩清单.xlsx`;

        XLSX.writeFile(wb, fileName);
        message.success('导出成功！');
    };

    // Build dynamic columns
    const columns: ProColumns<StudentScoreItem>[] = [
        {
            title: '排名',
            dataIndex: 'rank',
            valueType: 'indexBorder',
            width: 48,
            fixed: 'left',
        },
        {
            title: '学号',
            dataIndex: 'student_number',
            width: 120,
        },
        {
            title: '姓名',
            dataIndex: 'student_name',
            width: 120,
            fixed: 'left',
        },
        {
            title: '班级',
            dataIndex: 'class_name',
            width: 120,
        },
        // Dynamic subject columns
        ...subjects.map(subject => ({
            title: subject,
            dataIndex: ['scores', subject],
            width: 100,
            render: (score: number) => {
                if (score === undefined || score === null) return '-';
                let color = '#333';
                if (subject.includes('语文')) color = '#f56a00'; // Orange
                else if (subject.includes('数学')) color = '#1890ff'; // Blue
                else if (subject.includes('英语')) color = '#52c41a'; // Green
                else if (subject.includes('物理')) color = '#13c2c2'; // Cyan
                else if (subject.includes('化学')) color = '#722ed1'; // Purple
                else if (subject.includes('生物')) color = '#a0d911'; // Lime
                else if (subject.includes('历史')) color = '#faad14'; // Gold
                else if (subject.includes('地理')) color = '#2f54eb'; // Geekblue
                else if (subject.includes('政治')) color = '#eb2f96'; // Magenta

                // Highlight high/low scores
                let fontWeight = 'normal';
                if (score >= 90) fontWeight = 'bold';
                if (score < 60) color = '#ff4d4f'; // Fail - Red override

                return <span style={{ color, fontWeight }}>{score}</span>;
            },
            sorter: (a: StudentScoreItem, b: StudentScoreItem) => {
                const scoreA = a.scores?.[subject] || 0;
                const scoreB = b.scores?.[subject] || 0;
                return scoreA - scoreB;
            },
        })),
        // Only show total column when not filtering by a single course
        ...(!selectedCourseId ? [{
            title: '总分',
            dataIndex: 'total',
            width: 80,
            render: (total: number) => <strong>{total}</strong>,
            sorter: (a: StudentScoreItem, b: StudentScoreItem) => a.total - b.total,
            defaultSortOrder: 'descend' as const,
        }] : []),
    ];

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
                            }}
                            style={{ width: '100%' }}
                            placeholder="全部班级"
                            allowClear
                            options={classes.map(cls => ({
                                label: cls.name,
                                value: cls.id.toString()
                            }))}
                        />
                    </Col>
                    <Col span={6}>
                        <Select
                            value={selectedExamName}
                            onChange={setSelectedExamName}
                            style={{ width: '100%' }}
                            placeholder="全部考试"
                            allowClear
                            options={uniqueExamNames.map(name => ({
                                label: name,
                                value: name
                            }))}
                        />
                    </Col>
                    <Col span={6}>
                        <Select
                            value={selectedCourseId}
                            onChange={setSelectedCourseId}
                            style={{ width: '100%' }}
                            placeholder="全部科目"
                            allowClear
                            options={courses.map(course => ({
                                label: course.name,
                                value: course.id.toString()
                            }))}
                        />
                    </Col>
                </Row>
            </Card>

            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                <Space>
                    <Tag color="blue">Ant Design Pro</Tag>
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleExport}
                        disabled={scoresData.length === 0}
                    >
                        导出成绩
                    </Button>
                </Space>
            </div>

            <ProTable<StudentScoreItem>
                columns={columns}
                dataSource={scoresData}
                loading={loading}
                rowKey="student_id"
                pagination={{
                    pageSize: 20,
                    showTotal: (total) => `共 ${total} 名学生`,
                    showSizeChanger: true,
                    pageSizeOptions: ['20', '50', '100'],
                }}
                scroll={{ x: 1500, y: 600 }}
                search={false}
                options={{
                    setting: {
                        listsHeight: 400,
                    },
                }}
                stickyHeaderOffset={64}
            />
        </div>
    );
}