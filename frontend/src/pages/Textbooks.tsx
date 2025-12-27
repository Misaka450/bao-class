import { useState } from 'react';
import { Card, Upload, Select, Button, Table, Tag, message, Space, Typography } from 'antd';
import { UploadOutlined, BookOutlined, CheckCircleOutlined, LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
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
    const queryClient = useQueryClient();

    const { data: catalog, isLoading } = useQuery({
        queryKey: ['textbook-catalog'],
        queryFn: () => textbookApi.getCatalog()
    });

    const uploadMutation = useMutation({
        mutationFn: (file: File) => textbookApi.upload(file, subject, grade, volume),
        onSuccess: () => {
            message.success('教材上传成功，正在解析中...');
            queryClient.invalidateQueries({ queryKey: ['textbook-catalog'] });
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
            render: () => <Tag icon={<CheckCircleOutlined />} color="success">已就绪</Tag>
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
                </Space>
            </Card>

            <Card title="已上传教材">
                <Table columns={columns} dataSource={catalog || []} loading={isLoading} rowKey={(r) => `${r.subject}-${r.grade}-${r.volume}`} pagination={false} />
            </Card>
        </div>
    );
}
