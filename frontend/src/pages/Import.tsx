import { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Button, Upload, message, Alert, Table, Select, Form, Steps, Descriptions, Collapse, Tag, Input, Row, Col } from 'antd';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import { DownloadOutlined, UploadOutlined, FileExcelOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config';

const { Panel } = Collapse;
const { Option } = Select;

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


    // AI 相关状态
    const [aiRecognizing, setAiRecognizing] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);
    const [aiPreviewData, setAiPreviewData] = useState<any[]>([]); // { name: string, score: number, studentId?: number, matched: boolean }
    const [selectedSubject, setSelectedSubject] = useState<string>();

    const { user, token } = useAuthStore();

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

    // AI 识别处理
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

            // 预处理识别数据，尝试匹配学生
            const processedData = await Promise.all(
                (data.data || []).map(async (item: any) => {
                    // 这里尝试在已加载的 classes/students 中匹配，但由于目前没有加载全市学生，
                    // 我们依赖选中的班级。如果 AI 识别出了班级，可以尝试自动选择。
                    return {
                        ...item,
                        matched: false,
                        studentId: undefined,
                    };
                })
            );

            // 如果 AI 识别到了班级，尝试自动匹配
            if (data.className) {
                const matchedClass = classes.find(c => c.name.includes(data.className) || data.className.includes(c.name));
                if (matchedClass) {
                    setSelectedClass(matchedClass.id.toString());
                    message.info(`AI 自动识别班级: ${matchedClass.name}`);
                }
            }

            setAiPreviewData(processedData);
            setCurrentStep(1); // 直接进入预览步骤（复用 Step 1UI，但内容不同）
        } catch (error) {
            message.error('AI 识别请求失败');
            console.error(error);
        } finally {
            setAiRecognizing(false);
        }
        return false;
    };

    // 在选中班级后，自动匹配 AI 识别出的学生姓名
    useEffect(() => {
        if (activeTab === 'ai-scores' && selectedClass && aiPreviewData.length > 0) {
            // 这部分逻辑需要加载班级学生，由于前面没加载，这里补充 fetch
            loadClassStudents(selectedClass);
        }
    }, [selectedClass, activeTab, aiResult]);

    const [classStudents, setClassStudents] = useState<any[]>([]);
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

    // 手动修改匹配
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

    // 确认 AI 导入并提交
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
            // 构造为 Excel 导入同样的格式进行提交，或者直接调用后端 score 接口
            // 为了简单起见，我们生成一个临时的 Excel 对象或者直接 POST JSON（如果后端支持）
            // 目前后端 /scores 接口只支持 FormData file，所以我们在这里模拟转换。

            // 方案B：既然我们已经有了结构化数据，可以直接批量提交到 scores 接口（如果后端有的话）
            // 检查发现后端 scores.ts 没有批量录入，只有 import.ts 的 Excel 导入。
            // 我们动态创建一个 Excel 文件并上传。

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

    // 重置状态
    const handleReset = () => {
        setCurrentStep(0);
        setPreviewData([]);
        setValidationResult(null);
        setUploadedFile(null);
        setResult(null);
        setAiResult(null);
        setAiPreviewData([]);
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
                    <Card title={<span><DownloadOutlined style={{ color: '#1890ff', marginRight: 8 }} />步骤 1: 下载模板</span>} style={{ marginBottom: 16 }}>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownloadTemplate('students')}
                        >
                            下载学生导入模板
                        </Button>
                    </Card>

                    <Card title={<span><UploadOutlined style={{ color: '#52c41a', marginRight: 8 }} />步骤 2: 上传文件</span>}>
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
                <Card title={<span><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />数据预览与验证</span>}>
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

    const filteredClasses = classes.filter(c =>
        user?.role === 'admin' ||
        (user?.authorizedClassIds === 'ALL' || user?.authorizedClassIds?.includes(c.id))
    );

    const filteredExams = exams.filter(e =>
        user?.role === 'admin' ||
        (user?.authorizedClassIds === 'ALL' || user?.authorizedClassIds?.includes(e.class_id))
    );

    const tabItems = [
        ...(user?.role === 'admin' ? [{
            key: 'students',
            label: (
                <span>
                    <FileExcelOutlined style={{ marginRight: 4 }} /> 学生导入
                </span>
            ),
            children: renderStudentsTab(),
        }] : []),
        {
            key: 'scores',
            label: (
                <span>
                    <FileExcelOutlined style={{ marginRight: 4 }} /> 成绩导入
                </span>
            ),
            children: (
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
                                    onClick={() => handleDownloadTemplate('scores')}
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
            ),
        },
        {
            key: 'ai-scores',
            label: (
                <span>
                    <UploadOutlined /> AI 拍照导入
                </span>
            ),
            children: (
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
                                                    options={filteredExams
                                                        .filter(e => !selectedClass || e.class_id === Number(selectedClass))
                                                        .map(e => ({ label: e.name, value: e.id }))}
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
                                                    options={(exams.find(e => e.id === Number(selectedExam))?.courses || []).map((c: any) => ({
                                                        label: c.course_name,
                                                        value: c.course_name
                                                    }))}
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
                                                        // Update match status based on new name? 
                                                        // For now, let's keep it simple, maybe just update the name used for display.
                                                        // Real matching logic is complex, might need re-run match or manual select.
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
                                        render: (text, record, index) => (
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
                            {renderResultSummary()}
                            <Button type="primary" onClick={handleReset}>
                                继续导入其他照片
                            </Button>
                        </>
                    )}
                </div>
            ),
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
