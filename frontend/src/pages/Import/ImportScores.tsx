import { useState, useEffect } from 'react';
import { Card, Button, Upload, Alert, Steps, Form, Select, Row, Col, message } from 'antd';
import { DownloadOutlined, UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import { API_BASE_URL } from '../../config';
import { useImportBase, useClassesAndExams } from './hooks/useImportState';
import { ValidationSummary, PreviewTable, ResultSummary } from './components/SharedComponents';

export default function ImportScores() {
    const {
        token,
        currentStep,
        setCurrentStep,
        uploading,
        setUploading,
        validating,
        setValidating,
        result,
        setResult,
        previewData,
        setPreviewData,
        validationResult,
        setValidationResult,
        uploadedFile,
        setUploadedFile,
        parseExcelFile,
        handleReset,
    } = useImportBase();

    const { filteredClasses, filteredExams, fetchClasses, fetchExams } = useClassesAndExams();
    const [selectedClass, setSelectedClass] = useState<string>();
    const [selectedExam, setSelectedExam] = useState<string>();

    useEffect(() => {
        fetchClasses();
        fetchExams();
    }, [fetchClasses, fetchExams]);

    const handleDownloadTemplate = async () => {
        try {
            if (!selectedClass || !selectedExam) {
                message.warning('请先选择班级和考试');
                return;
            }

            const url = `${API_BASE_URL}/api/import/template/scores?classId=${selectedClass}&examId=${selectedExam}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const text = await res.text();
                message.error(text || '模板下载失败');
                return;
            }

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = '成绩导入模板.xlsx';
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            message.success('模板下载成功');
        } catch (error) {
            message.error('模板下载失败');
        }
    };

    const handleFileUpload = async (file: RcFile) => {
        if (!selectedExam) {
            message.warning('请先选择考试');
            return false;
        }

        setValidating(true);
        setUploadedFile(file);

        try {
            const data = await parseExcelFile(file);

            if (data.length === 0) {
                message.error('文件内容为空');
                setValidating(false);
                return false;
            }

            const validateUrl = `${API_BASE_URL}/api/import/validate/scores`;
            const res = await fetch(validateUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data, examId: Number(selectedExam) })
            });

            const validation = await res.json();

            if (!res.ok) {
                message.error(validation.error || '数据验证失败');
                setValidating(false);
                return false;
            }

            setValidationResult(validation);
            setPreviewData(validation.fixedData || data);
            setCurrentStep(1);
            message.success('文件解析成功，请查看预览');
        } catch (error) {
            message.error('文件解析失败');
            console.error(error);
        } finally {
            setValidating(false);
        }

        return false;
    };

    const handleConfirmImport = async () => {
        if (!uploadedFile) {
            message.error('请先上传文件');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', uploadedFile);
            if (selectedExam) {
                formData.append('examId', selectedExam);
            }

            const res = await fetch(`${API_BASE_URL}/api/import/scores`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();
            setResult(data);
            setCurrentStep(2);

            if (data.success || (data.failed === 0 && data.total > 0)) {
                message.success('导入成功！');
            } else if (data.error) {
                message.error(data.error);
            } else {
                message.warning('部分数据导入失败，请查看详情');
            }
        } catch (error) {
            message.error('导入失败');
        } finally {
            setUploading(false);
        }
    };

    const handleResetLocal = () => {
        handleReset();
        setSelectedClass(undefined);
        setSelectedExam(undefined);
    };

    return (
        <div>
            <Alert
                message="导入说明"
                description="1. 选择班级和考试下载模板（模板会自动包含该班级学生和考试科目）。 2. 填写分数。 3. 选择对应考试上传文件。"
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Steps current={currentStep} style={{ marginBottom: 24 }}>
                <Steps.Step title="上传文件" />
                <Steps.Step title="数据预览" />
                <Steps.Step title="导入完成" />
            </Steps>

            {currentStep === 0 && (
                <>
                    <Card title={<span><DownloadOutlined style={{ color: '#1890ff', marginRight: 8 }} />步骤 1: 下载定制模板</span>} style={{ marginBottom: 16 }}>
                        <Form layout="vertical" style={{ marginBottom: 16 }}>
                            <Row gutter={16}>
                                <Col xs={24} sm={12}>
                                    <Form.Item label="选择班级" required tooltip="仅显示您管辖的班级">
                                        <Select
                                            style={{ width: '100%' }}
                                            placeholder="请选择班级"
                                            value={selectedClass}
                                            onChange={setSelectedClass}
                                            options={filteredClasses.map(c => ({ label: c.name, value: c.id }))}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item label="选择考试" required tooltip="系统将根据班级自动过滤考试">
                                        <Select
                                            style={{ width: '100%' }}
                                            placeholder={selectedClass ? "请选择考试" : "请先选择班级"}
                                            value={selectedExam}
                                            onChange={setSelectedExam}
                                            options={filteredExams
                                                .filter(e => !selectedClass || e.class_id === Number(selectedClass))
                                                .map(e => ({ label: e.name, value: e.id }))}
                                            disabled={!selectedClass}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Form>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={handleDownloadTemplate}
                            disabled={!selectedClass || !selectedExam}
                        >
                            生成并下载成绩模板
                        </Button>
                    </Card>

                    <Card title={<span><UploadOutlined style={{ color: '#52c41a', marginRight: 8 }} />步骤 2: 上传成绩文件</span>}>
                        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                            <span style={{ marginRight: 12, fontWeight: 500 }}>确认归属考试:</span>
                            <Select
                                style={{ width: '100%', maxWidth: 300 }}
                                placeholder="请选择考试"
                                value={selectedExam}
                                onChange={setSelectedExam}
                                options={filteredExams
                                    .filter(e => !selectedClass || e.class_id === Number(selectedClass))
                                    .map(e => ({ label: e.name, value: e.id }))}
                            />
                        </div>
                        <Upload.Dragger
                            name="file"
                            accept=".xlsx,.xls"
                            beforeUpload={handleFileUpload}
                            maxCount={1}
                            disabled={validating || !selectedExam}
                            showUploadList={false}
                        >
                            <p className="ant-upload-drag-icon">
                                <UploadOutlined style={{ fontSize: 48, color: '#667eea' }} />
                            </p>
                            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                            <p className="ant-upload-hint">支持 .xlsx 格式文件，上传后将自动验证数据</p>
                        </Upload.Dragger>
                    </Card>
                </>
            )}

            {currentStep === 1 && (
                <Card title="数据预览">
                    <ValidationSummary validationResult={validationResult} />
                    <PreviewTable data={previewData} />
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <Button onClick={handleResetLocal}>重新选择文件</Button>
                        <Button
                            type="primary"
                            onClick={handleConfirmImport}
                            loading={uploading}
                            disabled={validationResult?.invalid ? validationResult.invalid > 0 : false}
                        >
                            {validationResult?.invalid && validationResult.invalid > 0 ? '存在错误，无法导入' : '确认导入'}
                        </Button>
                    </div>
                </Card>
            )}

            {currentStep === 2 && (
                <>
                    <ResultSummary result={result} />
                    <Button type="primary" onClick={handleResetLocal}>
                        继续导入
                    </Button>
                </>
            )}
        </div>
    );
}
