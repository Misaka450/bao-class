import { useState, useEffect, useRef } from 'react';
import { Card, Upload, Select, Button, Table, Tag, message, Space, Typography, notification, Progress } from 'antd';
import { UploadOutlined, BookOutlined, CheckCircleOutlined, LoadingOutlined, SyncOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { textbookApi } from '../services/api';

const { Title } = Typography;
const { Dragger } = Upload;

const subjects = [
    { value: 'math', label: '数学' },
    { value: 'chinese', label: '语文' },
    { value: 'english', label: '英语' },
];

const grades = [
    { value: '1', label: '一年级' },
    { value: '2', label: '二年级' },
    { value: '3', label: '三年级' },
    { value: '4', label: '四年级' },
    { value: '5', label: '五年级' },
    { value: '6', label: '六年级' },
];

const volumes = [
    { value: '1', label: '上册' },
    { value: '2', label: '下册' },
];

export default function Textbooks() {
    const [subject, setSubject] = useState<string>('');
    const [grade, setGrade] = useState<string>('');
    const [volume, setVolume] = useState<string>('');
    const [uploading, setUploading] = useState(false);
    const [processingKey, setProcessingKey] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const queryClient = useQueryClient();

    const { data: catalog, isLoading } = useQuery({
        queryKey: ['textbook-catalog'],
        queryFn: () => textbookApi.getCatalog(),
        refetchInterval: processingKey ? 5000 : false // 解析中时每5秒刷新
    });

    // 清理轮询定时器
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // 轮询检查解析状态
    const startPolling = (s: string, g: string, v: string) => {
        const key = `${s}-${g}-${v}`;
        setProcessingKey(key);
        setProgress(10);

        let pollCount = 0;
        pollIntervalRef.current = setInterval(async () => {
            pollCount++;
            setProgress(Math.min(10 + pollCount * 15, 90)); // 模拟进度

            try {
                const status = await textbookApi.getStatus(s, g, v);
                if (status.status === 'ready') {
                    clearInterval(pollIntervalRef.current!);
                    setProcessingKey(null);
                    setProgress(100);

                    notification.success({
                        message: '教材解析完成',
                        description: `${subjects.find(x => x.value === s)?.label} ${grades.find(x => x.value === g)?.label}${volumes.find(x => x.value === v)?.label} 已解析完成，可以用于备课了！`,
                        duration: 5
                    });

                    queryClient.invalidateQueries({ queryKey: ['textbook-catalog'] });
                    setTimeout(() => setProgress(0), 1000);
                } else if (status.status === 'error') {
                    clearInterval(pollIntervalRef.current!);
                    setProcessingKey(null);
                    setProgress(0);
                    notification.error({
                        message: '教材解析失败',
                        description: '请重新上传教材',
                        duration: 5
                    });
                }
            } catch {
                // 忽略错误，继续轮询
            }

            // 最多轮询 2 分钟
            if (pollCount > 24) {
                clearInterval(pollIntervalRef.current!);
                setProcessingKey(null);
                setProgress(0);
            }
        }, 5000);
    };

    const uploadMutation = useMutation({
        mutationFn: (file: File) => textbookApi.upload(file, subject, grade, volume),
        onSuccess: () => {
            message.success('教材上传成功，正在解析中...');
            startPolling(subject, grade, volume);
        },
        onError: () => {
            message.error('上传失败');
        }
    });

    const handleUpload = async (file: File) => {
        if (!subject || !grade || !volume) {
            message.warning('请先选择科目、年级和册次');
            return false;
        }
        setUploading(true);
        await uploadMutation.mutateAsync(file);
        setUploading(false);
        return false;
    };

    const columns = [
        {
            title: '科目',
            dataIndex: 'subject',
            render: (s: string) => subjects.find(x => x.value === s)?.label || s
        },
        {
            title: '年级',
            dataIndex: 'grade',
            render: (g: number) => grades.find(x => x.value === String(g))?.label || `${g}年级`
        },
        {
            title: '册次',
            dataIndex: 'volume',
            render: (v: number) => v === 1 ? '上册' : '下册'
        },
        {
            title: '章节数',
            dataIndex: 'chapters',
            render: (chapters: any[]) => chapters?.length || 0
        },
        {
            title: '状态',
            key: 'status',
            render: (_: any, record: any) => {
                const key = `${record.subject}-${record.grade}-${record.volume}`;
                if (processingKey === key) {
                    return <Tag icon={<SyncOutlined spin />} color="processing">解析中</Tag>;
                }
                return <Tag icon={<CheckCircleOutlined />} color="success">已就绪</Tag>;
            }
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: any) => (
                <Button type="link" href={`/api/textbooks/preview/${record.subject}/${record.grade}/${record.volume}`} target="_blank">
                    预览
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <Title level={3}><BookOutlined /> 教材管理</Title>

            <Card title="上传教材" style={{ marginBottom: 24 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Space wrap>
                        <Select placeholder="选择科目" style={{ width: 120 }} options={subjects} value={subject || undefined} onChange={setSubject} />
                        <Select placeholder="选择年级" style={{ width: 120 }} options={grades} value={grade || undefined} onChange={setGrade} />
                        <Select placeholder="选择册次" style={{ width: 120 }} options={volumes} value={volume || undefined} onChange={setVolume} />
                    </Space>

                    <Dragger accept=".pdf" showUploadList={false} beforeUpload={handleUpload} disabled={uploading || !subject || !grade || !volume}>
                        <p className="ant-upload-drag-icon">{uploading ? <LoadingOutlined /> : <UploadOutlined />}</p>
                        <p className="ant-upload-text">点击或拖拽上传教材 PDF</p>
                        <p className="ant-upload-hint">请上传人教版整本教材 PDF 文件</p>
                    </Dragger>

                    {progress > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <Progress percent={progress} status={progress === 100 ? 'success' : 'active'} />
                            <p style={{ color: '#666', marginTop: 8 }}>
                                {progress < 100 ? '正在解析教材，请稍候...' : '解析完成！'}
                            </p>
                        </div>
                    )}
                </Space>
            </Card>

            <Card title="已上传教材">
                <Table columns={columns} dataSource={catalog || []} loading={isLoading} rowKey={(r) => `${r.subject}-${r.grade}-${r.volume}`} pagination={false} />
            </Card>
        </div>
    );
}
