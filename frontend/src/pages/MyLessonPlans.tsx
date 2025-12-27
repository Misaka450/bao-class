import { useState } from 'react';
import { Card, Table, Button, Modal, Typography, message, Space, Tag, Input, Empty } from 'antd';
import { FileTextOutlined, DeleteOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { lessonPrepApi } from '../services/api';

const { Title } = Typography;

export default function MyLessonPlans() {
    const [viewPlan, setViewPlan] = useState<any>(null);
    const [searchText, setSearchText] = useState('');
    const queryClient = useQueryClient();

    const { data: plans, isLoading } = useQuery({
        queryKey: ['my-lesson-plans'],
        queryFn: () => lessonPrepApi.getMyPlans()
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => lessonPrepApi.deletePlan(id),
        onSuccess: () => {
            message.success('删除成功');
            queryClient.invalidateQueries({ queryKey: ['my-lesson-plans'] });
        }
    });

    const handleDelete = (id: number) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这份教案吗？',
            onOk: () => deleteMutation.mutateAsync(id)
        });
    };

    const subjectNames: Record<string, string> = { math: '数学', chinese: '语文', english: '英语' };

    const filteredPlans = plans?.filter((p: any) => p.title?.includes(searchText));

    const columns = [
        { title: '教案标题', dataIndex: 'title', key: 'title', ellipsis: true },
        {
            title: '适用教材',
            key: 'chapter',
            render: (_: any, record: any) => (
                <span>{subjectNames[record.subject] || record.subject} {record.grade}年级{record.volume === 1 ? '上' : '下'}册</span>
            )
        },
        { title: '创建时间', dataIndex: 'created_at', render: (t: string) => new Date(t).toLocaleDateString() },
        { title: '状态', key: 'status', render: (_: any, record: any) => record.is_draft ? <Tag color="orange">草稿</Tag> : <Tag color="green">已完成</Tag> },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: any) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => setViewPlan(record)}>查看</Button>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <Title level={3}><FileTextOutlined /> 我的教案</Title>

            <Card>
                <div style={{ marginBottom: 16 }}>
                    <Input placeholder="搜索教案..." prefix={<SearchOutlined />} style={{ width: 300 }} value={searchText} onChange={e => setSearchText(e.target.value)} />
                </div>
                <Table columns={columns} dataSource={filteredPlans || []} loading={isLoading} rowKey="id" locale={{ emptyText: <Empty description="暂无教案" /> }} />
            </Card>

            <Modal title={viewPlan?.title} open={!!viewPlan} onCancel={() => setViewPlan(null)} footer={null} width={800}>
                {viewPlan && <div className="markdown-content" style={{ maxHeight: '60vh', overflow: 'auto' }}><ReactMarkdown>{viewPlan.content}</ReactMarkdown></div>}
            </Modal>
        </div>
    );
}
