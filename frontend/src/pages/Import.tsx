import { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Button, Upload, message, Alert, Table, Select, Form } from 'antd';
import { DownloadOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config';

export default function Import() {
    const [activeTab, setActiveTab] = useState('students');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [exams, setExams] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>();
    const [selectedExam, setSelectedExam] = useState<string>();

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

    const handleUpload = async (file: RcFile) => {
        if (activeTab === 'scores' && !selectedExam) {
            message.warning('请先选择考试');
            return false;
        }

        setUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
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

        return false; // Prevent auto upload
    };

    const columns = [
        { title: '总计', dataIndex: 'total', key: 'total' },
        { title: '成功', dataIndex: 'success', key: 'success' },
        { title: '失败', dataIndex: 'failed', key: 'failed' },
    ];

    const tabItems = [
        {
            key: 'students',
            label: (
                <span>
                    <FileExcelOutlined /> 学生导入
                </span>
            ),
            children: (
                <div>
                    <Alert
                        message="导入说明"
                        description="请先下载模板文件，按照模板格式填写学生数据，然后上传导入。支持 .xlsx 格式文件。"
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />

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
                            beforeUpload={handleUpload}
                            maxCount={1}
                            disabled={uploading}
                        >
                            <p className="ant-upload-drag-icon">
                                <UploadOutlined style={{ fontSize: 48, color: '#667eea' }} />
                            </p>
                            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                            <p className="ant-upload-hint">支持 .xlsx 格式文件</p>
                        </Upload.Dragger>
                    </Card>

                    {result && (
                        <Card title="导入结果" style={{ marginTop: 16 }}>
                            <Table
                                columns={columns}
                                dataSource={[result]}
                                pagination={false}
                                rowKey="total"
                            />
                            {result.errors && result.errors.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <h4>错误详情：</h4>
                                    <ul>
                                        {result.errors.map((err: string, idx: number) => (
                                            <li key={idx} style={{ color: '#ff4d4f' }}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            ),
        },
        {
            key: 'scores',
            label: (
                <span>
                    <FileExcelOutlined /> 成绩导入
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
                            beforeUpload={handleUpload}
                            maxCount={1}
                            disabled={uploading}
                        >
                            <p className="ant-upload-drag-icon">
                                <UploadOutlined style={{ fontSize: 48, color: '#667eea' }} />
                            </p>
                            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                            <p className="ant-upload-hint">支持 .xlsx 格式文件</p>
                        </Upload.Dragger>
                    </Card>

                    {result && (
                        <Card title="导入结果" style={{ marginTop: 16 }}>
                            <Table
                                columns={columns}
                                dataSource={[result]}
                                pagination={false}
                                rowKey="total"
                            />
                            {result.errors && result.errors.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <h4>错误详情：</h4>
                                    <ul>
                                        {result.errors.map((err: string, idx: number) => (
                                            <li key={idx} style={{ color: '#ff4d4f' }}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>数据导入</h2>
                <p style={{ margin: '4px 0 0 0', color: '#666' }}>批量导入学生和成绩数据</p>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
            />
        </div>
    );
}
