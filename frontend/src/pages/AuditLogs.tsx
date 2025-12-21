import { Card, Tag } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import PageHeader from '../components/Layout/PageHeader';
import api from '../services/api';

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
    const columns: ProColumns<AuditLog>[] = [
        {
            title: '时间',
            dataIndex: 'created_at',
            key: 'created_at',
            valueType: 'dateTime',
            width: 180,
            search: false,
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
            render: (_, record) => {
                let color = 'blue';
                if (record.action.includes('DELETE')) color = 'red';
                else if (record.action.includes('CREATE')) color = 'green';
                return <Tag color={color}>{record.action}</Tag>;
            },
        },
        {
            title: '对象',
            dataIndex: 'entity_type',
            key: 'entity_type',
            width: 100,
        },
        {
            title: '对象ID',
            dataIndex: 'entity_id',
            key: 'entity_id',
            width: 80,
            search: false,
        },
        {
            title: '详情',
            dataIndex: 'details',
            key: 'details',
            ellipsis: true,
            search: false,
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
                <ProTable<AuditLog>
                    columns={columns}
                    request={async (params) => {
                        const { data, total } = await api.logs.list({
                            current: params.current,
                            pageSize: params.pageSize,
                        });
                        return {
                            data: data || [],
                            total: total || 0,
                            success: true,
                        };
                    }}
                    rowKey="id"
                    pagination={{
                        pageSize: 20,
                    }}
                    search={false} // 后端暂未支持搜索，先禁用。后续可根据需求在 logs.ts 增加过滤
                    dateFormatter="string"
                    headerTitle="审计列表"
                    toolBarRender={false}
                    size="small"
                />
            </Card>
        </div>
    );
}
