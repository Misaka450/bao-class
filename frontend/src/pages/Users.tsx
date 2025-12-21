import { useRef, useState } from 'react';
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { ProTable, ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Button, Space, Tag, Popconfirm, message, Tooltip } from 'antd';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import api from '../services/api';
import { PageHeader } from '../components/Layout/PageHeader';

export default function Users() {
    const actionRef = useRef<ActionType>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentRow, setCurrentRow] = useState<any>();

    const columns: ProColumns<any>[] = [
        {
            title: '姓名',
            dataIndex: 'name',
            copyable: true,
            ellipsis: true,
            width: 120,
        },
        {
            title: '用户名',
            dataIndex: 'username',
            copyable: true,
            width: 120,
        },
        {
            title: '角色',
            dataIndex: 'role',
            width: 100,
            valueEnum: {
                admin: { text: '管理员', status: 'Error' },
                head_teacher: { text: '班主任', status: 'Success' },
                teacher: { text: '任课老师', status: 'Processing' },
            },
            render: (_, record) => {
                const colorMap: any = {
                    admin: 'red',
                    head_teacher: 'green',
                    teacher: 'blue',
                };
                const textMap: any = {
                    admin: '管理员',
                    head_teacher: '班主任',
                    teacher: '教师',
                };
                return <Tag color={colorMap[record.role]}>{textMap[record.role]}</Tag>;
            },
        },
        {
            title: '关联班级',
            dataIndex: 'assigned_classes',
            search: false,
            render: (val) => {
                if (!val || typeof val !== 'string') return <span style={{ color: '#ccc' }}>未关联</span>;
                return val.split(',').map((name: string) => (
                    <Tag key={name} color="cyan" style={{ marginBottom: 4 }}>{name}</Tag>
                ));
            },
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            valueType: 'dateTime',
            hideInSearch: true,
            width: 160,
        },
        {
            title: '操作',
            valueType: 'option',
            width: 120,
            render: (_, record) => [
                <Tooltip key="edit" title="编辑资料">
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setCurrentRow(record);
                            setModalVisible(true);
                        }}
                    />
                </Tooltip>,
                <Popconfirm
                    key="delete"
                    title="确定删除该账号吗？"
                    onConfirm={async () => {
                        try {
                            const res = await api.user.delete(record.id);
                            if (res) {
                                message.success('删除成功');
                                actionRef.current?.reload();
                            }
                        } catch (e) { }
                    }}
                >
                    <Tooltip title="注销账号">
                        <Button type="link" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                </Popconfirm>,
            ],
        },
    ];

    return (
        <div className="users-page">
            <PageHeader
                title="用户管理"
                subtitle="维护系统登录账号，分配角色及管理权限。"
            />

            <ProTable
                headerTitle="账号列表"
                actionRef={actionRef}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                }}
                toolBarRender={() => [
                    <Button
                        key="add"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setCurrentRow(undefined);
                            setModalVisible(true);
                        }}
                    >
                        新建账号
                    </Button>,
                ]}
                request={async (params) => {
                    const data = await api.user.list();
                    // 简单的内存检索模拟分析，生产推荐后端实现检索
                    let filtered = data;
                    if (params.name) {
                        filtered = filtered.filter((u: any) => u.name.includes(params.name));
                    }
                    if (params.username) {
                        filtered = filtered.filter((u: any) => u.username.includes(params.username));
                    }
                    if (params.role) {
                        filtered = filtered.filter((u: any) => u.role === params.role);
                    }
                    return {
                        data: filtered,
                        success: true,
                        total: filtered.length,
                    };
                }}
                columns={columns}
            />

            <ModalForm
                title={currentRow ? '编辑用户' : '新建用户'}
                width={400}
                open={modalVisible}
                onOpenChange={setModalVisible}
                onFinish={async (values) => {
                    try {
                        if (currentRow) {
                            await api.user.update(currentRow.id, values);
                            message.success('修改成功');
                        } else {
                            await api.user.create(values);
                            message.success('创建成功');
                        }
                        setModalVisible(false);
                        actionRef.current?.reload();
                        return true;
                    } catch (e) {
                        return false;
                    }
                }}
                initialValues={currentRow}
                modalProps={{
                    destroyOnClose: true,
                }}
            >
                <ProFormText
                    name="name"
                    label="姓名"
                    placeholder="请输入真实姓名"
                    rules={[{ required: true, message: '必填' }]}
                />
                <ProFormText
                    name="username"
                    label="用户名"
                    placeholder="起个登录名"
                    disabled={!!currentRow}
                    rules={[{ required: true, message: '必填' }]}
                />
                <ProFormText.Password
                    name="password"
                    label={currentRow ? '重置密码' : '初始密码'}
                    placeholder={currentRow ? '留空不修改' : '请输入密码'}
                    fieldProps={{
                        prefix: <KeyOutlined />,
                    }}
                    rules={[{ required: !currentRow, message: '必填' }]}
                />
                <ProFormSelect
                    name="role"
                    label="角色"
                    options={[
                        { label: '管理员', value: 'admin' },
                        { label: '班主任', value: 'head_teacher' },
                        { label: '任课老师', value: 'teacher' },
                    ]}
                    rules={[{ required: true, message: '必填' }]}
                />
            </ModalForm>
        </div>
    );
}
