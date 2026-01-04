import { useEffect } from 'react';
import { Card, Button, Upload, Alert, Steps } from 'antd';
import { DownloadOutlined, UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import { message } from 'antd';
import { API_BASE_URL } from '../../config';
import { useImportBase } from './hooks/useImportState';
import { ValidationSummary, PreviewTable, ResultSummary } from './components/SharedComponents';

export default function ImportStudents() {
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

    const handleDownloadTemplate = async () => {
        try {
            const url = `${API_BASE_URL}/api/import/template/students`;
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
            a.download = '学生导入模板.xlsx';
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            message.success('模板下载成功');
        } catch (error) {
            message.error('模板下载失败');
        }
    };

    const handleFileUpload = async (file: RcFile) => {
        setValidating(true);
        setUploadedFile(file);

        try {
            const data = await parseExcelFile(file);

            if (data.length === 0) {
                message.error('文件内容为空');
                setValidating(false);
                return false;
            }

            const validateUrl = `${API_BASE_URL}/api/import/validate/students`;
            const res = await fetch(validateUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data })
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

            const res = await fetch(`${API_BASE_URL}/api/import/students`, {
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

    return (
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
                            onClick={handleDownloadTemplate}
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
                    <ValidationSummary validationResult={validationResult} />
                    <PreviewTable data={previewData} />
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <Button onClick={handleReset}>重新选择文件</Button>
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
                    <Button type="primary" onClick={handleReset}>
                        继续导入
                    </Button>
                </>
            )}
        </div>
    );
}
