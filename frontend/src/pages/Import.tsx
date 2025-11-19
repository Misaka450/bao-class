import { useState } from 'react';
import { Card, Tabs, Button, Upload, message, Alert, Table } from 'antd';
import { DownloadOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import { useAuthStore } from '../store/authStore';

export default function Import() {
    const [activeTab, setActiveTab] = useState('students');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const token = useAuthStore((state) => state.token);

    const handleDownloadTemplate = async (type: string) => {
        try {
            const res = await fetch(`http://localhost:8787/api/import/template/${type}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_import_template.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            message.success('模板下载成功');
        } catch (error) {
            message.error('模板下载失败');
        }
    };

    const handleUpload = async (file: RcFile) => {
        setUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`http://localhost:8787/api/import/${activeTab}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();
            setResult(data);

            if (data.success || data.failed === 0) {
                message.success('导入成功！');
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
                        description="请先下载模板文件，按照模板格式填写成绩数据，然后上传导入。支持 .xlsx 格式文件。"
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />

                    <Card title="步骤 1: 下载模板" style={{ marginBottom: 16 }}>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownloadTemplate('scores')}
                        >
                            下载成绩导入模板
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
