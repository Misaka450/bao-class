import { useState, useEffect } from 'react';
import { Table, Card, Tag, message } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../store/authStore';
import PageHeader from '../components/PageHeader';

interface AuditLog {
    id: number;
    username: string;
    action: string;
    entity_type: string;
    entity_id: number;
    details: string;
    created_at: string;
}

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0,
    });
    const { token } = useAuthStore();

    const fetchLogs = async (page = 1, pageSize = 20) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/logs?page=${page}&pageSize=${pageSize}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.data);
                setPagination({
                    current: data.page,
                    pageSize: data.pageSize,
                    total: data.total,
                });
            } else {
                message.error('Failed to fetch logs');
            }
        } catch (error) {
            message.error('Failed to fetch logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleTableChange = (pagination: any) => {
        fetchLogs(pagination.current, pagination.pageSize);
    };

    const columns: ColumnsType<AuditLog> = [
        {
            title: '时间',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: (text) => new Date(text).toLocaleString(),
        },
        {
            title: '用户',
            dataIndex: 'username',
            key: 'username',
            width: 120,
        },
        {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            width: 150,
            render: (action) => {
                let color = 'blue';
                if (action.includes('DELETE')) color = 'red';
                else if (action.includes('CREATE')) color = 'green';
                return <Tag color={color}>{action}</Tag>;
            },
        },
        {
            title: '对象类型',
            dataIndex: 'entity_type',
            key: 'entity_type',
            width: 100,
        },
        {
            title: '对象ID',
            dataIndex: 'entity_id',
            key: 'entity_id',
            width: 80,
        },
        {
            title: '详情',
            dataIndex: 'details',
            key: 'details',
            ellipsis: true,
            render: (text) => <span title={text}>{text}</span>,
        },
    ];

    return (
        <div>
            <PageHeader
                title="操作日志"
                subtitle="查看系统的操作记录，追踪数据变更"
                icon={<SafetyCertificateOutlined />}
            />

            <Card bordered={false} bodyStyle={{ padding: 0 }}>
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="id"
                    loading={loading}
                    pagination={pagination}
                    onChange={handleTableChange}
                    scroll={{ x: 'max-content' }}
                    size="small"
                />
            </Card>
        </div>
    );
}
