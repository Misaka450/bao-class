import { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Button, Upload, message, Alert, Table, Select, Form, Steps, Descriptions, Collapse, Tag } from 'antd';
import { DownloadOutlined, UploadOutlined, FileExcelOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config';

const { Panel } = Collapse;

export default function Import() {
    const [activeTab, setActiveTab] = useState('students');
    const [currentStep, setCurrentStep] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>();
    const [selectedExam, setSelectedExam] = useState<string>();

    // 预览相关状态
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [validationResult, setValidationResult] = useState<any>(null);
    const [uploadedFile, setUploadedFile] = useState<RcFile | null>(null);

    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchClasses();
        fetchExams();
    }, [token]);

    const fetchClasses = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/classes`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setClasses(data);
        } catch (error) {
            console.error('Failed to fetch classes', error);
        }
    }, [token]);

    const fetchExams = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/exams`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setExams(data);
        } catch (error) {
            console.error('Failed to fetch exams', error);
        }
    }, [token]);

    const handleDownloadTemplate = async (type: string) => {
        try {
            let url = `${API_BASE_URL}/api/import/template/${type}`;

            if (type === 'scores') {
                if (!selectedClass || !selectedExam) {
                    message.warning('请先选择班级和考试');
                    return;
                }
                url += `?classId=${selectedClass}&examId=${selectedExam}`;
            }

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
            a.download = type === 'students' ? '学生导入模板.xlsx' : '成绩导入模板.xlsx';
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            message.success('模板下载成功');
        } catch (error) {
            message.error('模板下载失败');
        }
    };

    // 解析 Excel 文件
    const parseExcelFile = async (file: RcFile): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    // 步骤1：上传并预览
    const handleFileUpload = async (file: RcFile) => {
        if (activeTab === 'scores' && !selectedExam) {
            message.warning('请先选择考试');
            return false;
        }

        setValidating(true);
        setUploadedFile(file);

        try {
            // 解析 Excel 文件
            const data = await parseExcelFile(file);

            if (data.length === 0) {
                message.error('文件内容为空');
                setValidating(false);
                return false;
            }

            // 调用验证接口
            const validateUrl = `${API_BASE_URL}/api/import/validate/${activeTab}`;
            const body: any = { data };
            if (activeTab === 'scores') {
                body.examId = Number(selectedExam);
            }

            const res = await fetch(validateUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const validation = await res.json();

            if (!res.ok) {
                message.error(validation.error || '数据验证失败');
                setValidating(false);
                return false;
            }

            setValidationResult(validation);
            setPreviewData(validation.fixedData || data);
            setCurrentStep(1); // 进入预览步骤
            message.success('文件解析成功，请查看预览');
        } catch (error) {
            message.error('文件解析失败');
            console.error(error);
        } finally {
            setValidating(false);
        }

        return false; // 阻止自动上传
    };

    // 步骤2：确认导入
    const handleConfirmImport = async () => {
        if (!uploadedFile) {
            message.error('请先上传文件');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', uploadedFile);
            if (activeTab === 'scores' && selectedExam) {
                formData.append('examId', selectedExam);
            }

            const res = await fetch(`${API_BASE_URL}/api/import/${activeTab}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();
            setResult(data);
            setCurrentStep(2); // 进入结果步骤

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

    // 重置状态
    const handleReset = () => {
        setCurrentStep(0);
        setPreviewData([]);
        setValidationResult(null);
        setUploadedFile(null);
        setResult(null);
    };

    // 渲染验证警告
    const renderValidationSummary = () => {
        if (!validationResult) return null;

        const { valid, invalid, warnings } = validationResult;
        const errors = warnings?.filter((w: any) => w.level === 'error') || [];
        const warns = warnings?.filter((w: any) => w.level === 'warning') || [];

        return (
            <Alert
                type={invalid > 0 ? 'error' : warns.length > 0 ? 'warning' : 'success'}
                message={
                    <div>
                        <span style={{ marginRight: 16 }}>✅ 有效: {valid} 条</span>
                        {invalid > 0 && <span style={{ marginRight: 16 }}>❌ 错误: {invalid} 条</span>}
                        {warns.length > 0 && <span>⚠️ 警告: {warns.length} 条</span>}
                    </div>
                }
                description={
                    <Collapse ghost>
                        {errors.length > 0 && (
                            <Panel header={`错误详情 (${errors.length})`} key="errors">
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {errors.slice(0, 10).map((err: any, idx: number) => (
                                        <li key={idx} style={{ color: '#ff4d4f' }}>
                                            第 {err.row} 行 {err.field && `[${err.field}]`}: {err.message}
                                            {err.value && ` (${err.value})`}
                                        </li>
                                    ))}
                                    {errors.length > 10 && <li>...还有 {errors.length - 10} 条错误</li>}
                                </ul>
                            </Panel>
                        )}
                        {warns.length > 0 && (
                            <Panel header={`警告详情 (${warns.length})`} key="warnings">
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {warns.slice(0, 10).map((warn: any, idx: number) => (
                                        <li key={idx} style={{ color: '#faad14' }}>
                                            第 {warn.row} 行 {warn.field && `[${warn.field}]`}: {warn.message}
                                            {warn.fixed && warn.before && warn.after && (
                                                <span> (已修正: "{warn.before}" → "{warn.after}")</span>
                                            )}
                                        </li>
                                    ))}
                                    {warns.length > 10 && <li>...还有 {warns.length - 10} 条警告</li>}
                                </ul>
                            </Panel>
                        )}
                    </Collapse>
                }
                style={{ marginBottom: 16 }}
            />
        );
    };

    // 渲染预览表格
    const renderPreviewTable = () => {
        if (previewData.length === 0) return null;

        const columns = Object.keys(previewData[0]).map(key => ({
            title: key,
            dataIndex: key,
            key,
            width: 120,
            ellipsis: true
        }));

        return (
            <Table
                columns={columns}
                dataSource={previewData}
                rowKey={(_, index) => index!}
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
                scroll={{ x: 'max-content' }}
                size="small"
            />
        );
    };

    // 渲染结果统计
    const renderResultSummary = () => {
        if (!result) return null;

        return (
            <Card style={{ marginBottom: 16 }}>
                <Descriptions title="导入结果" column={4}>
                    <Descriptions.Item label="总计">{result.total}</Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#52c41a' }}>成功</span>}>
                        <Tag color="success" icon={<CheckCircleOutlined />}>{result.success}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#ff4d4f' }}>失败</span>}>
                        <Tag color="error" icon={<CloseCircleOutlined />}>{result.failed}</Tag>
                    </Descriptions.Item>
                    {result.warnings !== undefined && (
                        <Descriptions.Item label={<span style={{ color: '#faad14' }}>警告</span>}>
                            <Tag color="warning" icon={<WarningOutlined />}>{result.warnings || 0}</Tag>
                        </Descriptions.Item>
                    )}
                </Descriptions>

                {result.errors && result.errors.length > 0 && (
                    <Collapse style={{ marginTop: 16 }}>
                        <Panel header={`错误详情 (${result.errors.length})`} key="errors">
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {result.errors.map((err: string, idx: number) => (
                                    <li key={idx} style={{ color: '#ff4d4f' }}>{err}</li>
                                ))}
                            </ul>
                        </Panel>
                    </Collapse>
                )}
            </Card>
        );
    };

    const renderStudentsTab = () => (
        <div>
            <Alert
                message="导入说明"
                description="请先下载模板文件，按照模板格式填写学生数据，然后上传导入。支持 .xlsx 格式文件。"
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
                    <Card title="步骤 1: 下载模板" style={{ marginBottom: 16 }}>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownloadTemplate('students')}
                        >
                            下载学生导入模板
                        </Button>
                    </Card>

                    <Card title="步骤 2: 上传文件">
                        <Upload.Dragger
                            name="file"
                            accept=".xlsx,.xls"
                            beforeUpload={handleFileUpload}
                            maxCount={1}
                            disabled={validating}
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
                    {renderValidationSummary()}
                    {renderPreviewTable()}
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <Button onClick={handleReset}>重新选择文件</Button>
                        <Button
                            type="primary"
                            onClick={handleConfirmImport}
                            loading={uploading}
                            disabled={validationResult?.invalid > 0}
                        >
                            {validationResult?.invalid > 0 ? '存在错误，无法导入' : '确认导入'}
                        </Button>
                    </div>
                </Card>
            )}

            {currentStep === 2 && (
                <>
                    {renderResultSummary()}
                    <Button type="primary" onClick={handleReset}>
                        继续导入
                    </Button>
                </>
            )}
        </div>
    );

    const renderScoresTab = () => (
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
                    <Card title="步骤 1: 下载模板" style={{ marginBottom: 16 }}>
                        <Form layout="inline" style={{ marginBottom: 16 }}>
                            <Form.Item label="选择班级" required>
                                <Select
                                    style={{ width: 200 }}
                                    placeholder="请选择班级"
                                    value={selectedClass}
                                    onChange={setSelectedClass}
                                    options={classes.map(c => ({ label: c.name, value: c.id }))}
                                />
                            </Form.Item>
                            <Form.Item label="选择考试" required>
                                <Select
                                    style={{ width: 200 }}
                                    placeholder="请选择考试"
                                    value={selectedExam}
                                    onChange={setSelectedExam}
                                    options={exams
                                        .filter(e => !selectedClass || e.class_id === Number(selectedClass))
                                        .map(e => ({ label: e.name, value: e.id }))}
                                />
                            </Form.Item>
                        </Form>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownloadTemplate('scores')}
                            disabled={!selectedClass || !selectedExam}
                        >
                            下载成绩导入模板
                        </Button>
                    </Card>

                    <Card title="步骤 2: 上传文件">
                        <div style={{ marginBottom: 16 }}>
                            <span style={{ marginRight: 8, color: 'red' }}>*</span>
                            <span style={{ marginRight: 8 }}>确认归属考试:</span>
                            <Select
                                style={{ width: 200 }}
                                placeholder="请选择考试"
                                value={selectedExam}
                                onChange={setSelectedExam}
                                options={exams
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
                    {renderValidationSummary()}
                    {renderPreviewTable()}
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <Button onClick={handleReset}>重新选择文件</Button>
                        <Button
                            type="primary"
                            onClick={handleConfirmImport}
                            loading={uploading}
                            disabled={validationResult?.invalid > 0}
                        >
                            {validationResult?.invalid > 0 ? '存在错误，无法导入' : '确认导入'}
                        </Button>
                    </div>
                </Card>
            )}

            {currentStep === 2 && (
                <>
                    {renderResultSummary()}
                    <Button type="primary" onClick={handleReset}>
                        继续导入
                    </Button>
                </>
            )}
        </div>
    );

    const tabItems = [
        {
            key: 'students',
            label: (
                <span>
                    <FileExcelOutlined /> 学生导入
                </span>
            ),
            children: renderStudentsTab(),
        },
        {
            key: 'scores',
            label: (
                <span>
                    <FileExcelOutlined /> 成绩导入
                </span>
            ),
            children: renderScoresTab(),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>数据导入</h2>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>批量导入学生和成绩数据，支持智能验证和修复</p>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                    setActiveTab(key);
                    handleReset();
                }}
                items={tabItems}
            />
        </div>
    );
}
