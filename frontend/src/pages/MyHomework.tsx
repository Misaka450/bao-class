import { useState } from 'react';
import { Card, Table, Button, Modal, Typography, message, Space, Tag, Input, Empty } from 'antd';
import { FormOutlined, DeleteOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../config';

const { Title } = Typography;

// API 函数
const homeworkApi = {
    getList: async () => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/lesson-prep/homework/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        return data.data || [];
    },
    delete: async (id: number) => {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/lesson-prep/homework/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }
};

export default function MyHomework() {
    const [viewHomework, setViewHomework] = useState<any>(null);
    const [searchText, setSearchText] = useState('');
    const queryClient = useQueryClient();

    const { data: homework, isLoading } = useQuery({
        queryKey: ['my-homework'],
        queryFn: () => homeworkApi.getList()
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => homeworkApi.delete(id),
        onSuccess: () => {
            message.success('删除成功');
            queryClient.invalidateQueries({ queryKey: ['my-homework'] });
        }
    });

    const handleDelete = (id: number) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这份作业吗？',
            onOk: () => deleteMutation.mutateAsync(id)
        });
    };

    const subjectNames: Record<string, string> = { math: '数学', chinese: '语文', english: '英语' };
    const difficultyNames: Record<string, string> = { basic: '基础题', advanced: '提高题', challenge: '拓展题' };

    const filteredHomework = homework?.filter((h: any) => h.title?.includes(searchText));

    const columns = [
        { title: '作业标题', dataIndex: 'title', key: 'title', ellipsis: true },
        {
            title: '科目/年级',
            key: 'info',
            render: (_: any, record: any) => (
                <span>{subjectNames[record.subject] || record.subject} {record.grade}年级</span>
            )
        },
        {
            title: '难度',
            dataIndex: 'difficulty',
            render: (d: string) => {
                const color = d === 'basic' ? 'green' : d === 'advanced' ? 'blue' : 'purple';
                return <Tag color={color}>{difficultyNames[d] || d}</Tag>;
            }
        },
        { title: '创建时间', dataIndex: 'created_at', render: (t: string) => new Date(t).toLocaleDateString() },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: any) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => setViewHomework(record)}>查看</Button>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <Title level={3}><FormOutlined /> 我的作业</Title>

            <Card>
                <div style={{ marginBottom: 16 }}>
                    <Input placeholder="搜索作业..." prefix={<SearchOutlined />} style={{ width: 300 }} value={searchText} onChange={e => setSearchText(e.target.value)} />
                </div>
                <Table columns={columns} dataSource={filteredHomework || []} loading={isLoading} rowKey="id" locale={{ emptyText: <Empty description="暂无作业" /> }} />
            </Card>

            <Modal title={viewHomework?.title} open={!!viewHomework} onCancel={() => setViewHomework(null)} footer={null} width={800}>
                {viewHomework && <div className="markdown-content" style={{ maxHeight: '60vh', overflow: 'auto' }}><ReactMarkdown>{viewHomework.content}</ReactMarkdown></div>}
            </Modal>
        </div>
    );
}
