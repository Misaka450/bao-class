import { Card, Row, Col, Select } from 'antd';
import type { Class, Exam, Course } from '../types';

interface FilterBarProps {
    classes: Class[];
    exams: Exam[];
    courses: Course[];
    selectedClassId: string;
    selectedExamId: string;
    selectedCourseId: string;
    onClassChange: (id: string) => void;
    onExamChange: (id: string) => void;
    onCourseChange: (id: string) => void;
}

export default function FilterBar({
    classes,
    exams,
    courses,
    selectedClassId,
    selectedExamId,
    selectedCourseId,
    onClassChange,
    onExamChange,
    onCourseChange,
}: FilterBarProps) {
    return (
        <Card style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={24} md={8}>
                    <div style={{ marginBottom: 8, color: '#666' }}>班级</div>
                    <Select
                        value={selectedClassId}
                        onChange={onClassChange}
                        style={{ width: '100%' }}
                        placeholder="选择班级"
                    >
                        {classes.map((cls) => (
                            <Select.Option key={cls.id} value={cls.id.toString()}>
                                {cls.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Col>
                <Col xs={24} sm={24} md={8}>
                    <div style={{ marginBottom: 8, color: '#666' }}>考试</div>
                    <Select
                        value={selectedExamId}
                        onChange={onExamChange}
                        style={{ width: '100%' }}
                        placeholder="选择考试"
                        disabled={!selectedClassId}
                    >
                        {exams.map((exam) => (
                            <Select.Option key={exam.id} value={exam.id.toString()}>
                                {exam.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Col>
                <Col xs={24} sm={24} md={8}>
                    <div style={{ marginBottom: 8, color: '#666' }}>科目</div>
                    <Select
                        value={selectedCourseId}
                        onChange={onCourseChange}
                        style={{ width: '100%' }}
                        placeholder="全部科目"
                        disabled={!selectedExamId}
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
    );
}
