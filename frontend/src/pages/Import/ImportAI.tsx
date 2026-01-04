import { useState, useEffect } from 'react';
import { Card, Button, Upload, Alert, Steps, Form, Select, Row, Col, Table, Input, Tag, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../config';
import { useImportBase, useClassesAndExams } from './hooks/useImportState';
import { ResultSummary } from './components/SharedComponents';

interface AiPreviewItem {
    name: string;
    score: number | string;
    studentId?: number;
    matched: boolean;
}

export default function ImportAI() {
    const {
        token,
        currentStep,
        setCurrentStep,
        uploading,
        setUploading,
        result,
        setResult,
        handleReset: baseHandleReset,
    } = useImportBase();

    const { classes, filteredClasses, filteredExams, fetchClasses, fetchExams } = useClassesAndExams();
    const [selectedClass, setSelectedClass] = useState<string>();
    const [selectedExam, setSelectedExam] = useState<string>();
    const [selectedSubject, setSelectedSubject] = useState<string>();

    const [aiRecognizing, setAiRecognizing] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);
    const [aiPreviewData, setAiPreviewData] = useState<AiPreviewItem[]>([]);
    const [classStudents, setClassStudents] = useState<any[]>([]);

    useEffect(() => {
        fetchClasses();
        fetchExams();
    }, [fetchClasses, fetchExams]);

    const loadClassStudents = async (classId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/students?class_id=${classId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setClassStudents(data);

            // 执行精准匹配
            const newPreviewData = aiPreviewData.map(item => {
                const student = data.find((s: any) => s.name === item.name);
                if (student) {
                    return { ...item, studentId: student.id, matched: true };
                }
                return { ...item, matched: false };
            });
            setAiPreviewData(newPreviewData);
        } catch (error) {
            console.error('Failed to load class students', error);
        }
    };

    useEffect(() => {
        if (selectedClass && aiPreviewData.length > 0) {
            loadClassStudents(selectedClass);
        }
    }, [selectedClass, aiResult]);

    const handleAiUpload = async (file: RcFile) => {
        setAiRecognizing(true);
        setAiResult(null);
        setAiPreviewData([]);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${API_BASE_URL}/api/import/ai-scores`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                message.error(data.error || 'AI 识别失败');
                return false;
            }

            setAiResult(data);
            if (data.subject) {
                setSelectedSubject(data.subject);
            }

            const processedData: AiPreviewItem[] = (data.data || []).map((item: any) => ({
                ...item,
                matched: false,
                studentId: undefined,
            }));

            if (data.className) {
                const matchedClass = classes.find(c => c.name.includes(data.className) || data.className.includes(c.name));
                if (matchedClass) {
                    setSelectedClass(matchedClass.id.toString());
                    message.info(`AI 自动识别班级: ${matchedClass.name}`);
                }
            }

            setAiPreviewData(processedData);
            setCurrentStep(1);
        } catch (error) {
            message.error('AI 识别请求失败');
            console.error(error);
        } finally {
            setAiRecognizing(false);
        }
        return false;
    };

    const handleUpdateMatch = (index: number, studentId: number) => {
        const student = classStudents.find(s => s.id === studentId);
        const newData = [...aiPreviewData];
        newData[index] = {
            ...newData[index],
            studentId,
            name: student ? student.name : newData[index].name,
            matched: !!student
        };
        setAiPreviewData(newData);
    };

    const handleConfirmAiImport = async () => {
        if (!selectedExam) {
            message.warning('请选择归属考试');
            return;
        }

        const unmatchedCount = aiPreviewData.filter(item => !item.matched).length;
        if (unmatchedCount > 0) {
            message.warning(`还有 ${unmatchedCount} 条数据未匹配到学生，请先手动关联`);
            return;
        }

        setUploading(true);
        try {
            const header = ['姓名', '学号', selectedSubject || '成绩'];
            const rows = aiPreviewData.map(item => {
                const s = classStudents.find(st => st.id === item.studentId);
                return [s.name, s.student_id, item.score];
            });

            const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const file = new File([blob], 'ai_recognize.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const formData = new FormData();
            formData.append('file', file);
            formData.append('examId', selectedExam);

            const res = await fetch(`${API_BASE_URL}/api/import/scores`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();
            setResult(data);
            setCurrentStep(2);
            message.success('导入完成');
        } catch (error) {
            message.error('提交失败');
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        baseHandleReset();
        setAiResult(null);
        setAiPreviewData([]);
        setClassStudents([]);
        setSelectedClass(undefined);
        setSelectedExam(undefined);
        setSelectedSubject(undefined);
    };

    const exams = filteredExams.filter(e => !selectedClass || e.class_id === Number(selectedClass));
    const currentExam = exams.find(e => e.id === Number(selectedExam));
    const subjectOptions = (currentExam?.courses || []).map((c: any) => ({
        label: c.course_name,
        value: c.course_name
    }));

    return (
        <div>
            <Alert
                message="AI 智能识别说明"
                description="上传成绩单照片（手写或打印均可），系统将自动识别学生姓名和成绩。识别后请务必核对并关联学生账号。"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Steps current={currentStep} style={{ marginBottom: 24 }}>
                <Steps.Step title="上传照片" />
                <Steps.Step title="核对关联" />
                <Steps.Step title="完成导入" />
            </Steps>

            {currentStep === 0 && (
                <Card title="上传成绩单照片">
                    <Upload.Dragger
                        name="file"
                        accept="image/*"
                        beforeUpload={handleAiUpload}
                        maxCount={1}
                        disabled={aiRecognizing}
                        showUploadList={false}
                    >
                        <p className="ant-upload-drag-icon">
                            <UploadOutlined style={{ fontSize: 48, color: '#667eea' }} />
                        </p>
                        <p className="ant-upload-text">点击或拖拽照片到此区域</p>
                        <p className="ant-upload-hint">支持各种光照下的成绩单照片，AI 将自动解析表格</p>
                        {aiRecognizing && <div style={{ marginTop: 16 }}><Tag color="processing">正在通过 AI 深度解析中，请稍候...</Tag></div>}
                    </Upload.Dragger>
                </Card>
            )}

            {currentStep === 1 && (
                <Card title="AI 识别结果核对">
                    <div style={{ marginBottom: 16 }}>
                        <Form layout="vertical">
                            <Row gutter={16}>
                                <Col xs={24} sm={8}>
                                    <Form.Item label="确认班级" required>
                                        <Select
                                            placeholder="请选择班级"
                                            value={selectedClass}
                                            onChange={setSelectedClass}
                                            options={filteredClasses.map(c => ({ label: c.name, value: c.id }))}
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={8}>
                                    <Form.Item label="确认考试" required>
                                        <Select
                                            placeholder="请选择考试"
                                            value={selectedExam}
                                            onChange={setSelectedExam}
                                            options={exams.map(e => ({ label: e.name, value: e.id }))}
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={8}>
                                    <Form.Item label="确认科目" required>
                                        <Select
                                            placeholder="请选择科目"
                                            value={selectedSubject}
                                            onChange={setSelectedSubject}
                                            options={subjectOptions}
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Form>
                    </div>

                    <Table
                        dataSource={aiPreviewData}
                        rowKey={(_, index) => index!}
                        pagination={false}
                        columns={[
                            {
                                title: '识别出的姓名',
                                dataIndex: 'name',
                                key: 'name',
                                render: (text, record, index) => (
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <Input
                                            value={text}
                                            onChange={(e) => {
                                                const newData = [...aiPreviewData];
                                                newData[index].name = e.target.value;
                                                setAiPreviewData(newData);
                                            }}
                                            style={{ width: 120, marginRight: 8 }}
                                        />
                                        {!record.matched && <Tag color="error">未匹配</Tag>}
                                    </div>
                                )
                            },
                            {
                                title: '成绩',
                                dataIndex: 'score',
                                key: 'score',
                                render: (text, _, index) => (
                                    <Input
                                        value={text}
                                        onChange={(e) => {
                                            const newData = [...aiPreviewData];
                                            newData[index].score = e.target.value;
                                            setAiPreviewData(newData);
                                        }}
                                        style={{ width: 100 }}
                                    />
                                )
                            },
                            {
                                title: '关联系统学生',
                                key: 'match',
                                render: (_, record, index) => (
                                    <Select
                                        showSearch
                                        style={{ width: '100%' }}
                                        placeholder="选择或搜索学生"
                                        value={record.studentId}
                                        onChange={(val) => handleUpdateMatch(index, val)}
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        options={classStudents.map(s => ({ label: s.name, value: s.id }))}
                                        status={record.matched ? '' : 'error'}
                                    />
                                )
                            }
                        ]}
                    />

                    <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                        <Button onClick={handleReset}>重新上传</Button>
                        <Button
                            type="primary"
                            onClick={handleConfirmAiImport}
                            loading={uploading}
                            disabled={aiPreviewData.length === 0}
                        >
                            确认并提交成绩
                        </Button>
                    </div>
                </Card>
            )}

            {currentStep === 2 && (
                <>
                    <ResultSummary result={result} />
                    <Button type="primary" onClick={handleReset}>
                        继续导入其他照片
                    </Button>
                </>
            )}
        </div>
    );
}
