import { useState, useRef } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ProTable, ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Button, Space, Popconfirm, message } from 'antd';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import type { Class } from '../types';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Classes() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';
    const actionRef = useRef<ActionType>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);

    const handleAdd = () => {
        setEditingClass(null);
        setIsModalOpen(true);
    };

    const handleEdit = (record: Class) => {
        setEditingClass(record);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await api.class.delete(id);
            message.success('删除成功');
            actionRef.current?.reload();
        } catch (error) {
            // Error already handled in request layer
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            if (editingClass) {
                await api.class.update(editingClass.id, values);
                message.success('更新成功');
            } else {
                await api.class.create(values);
                message.success('添加成功');
            }
            setIsModalOpen(false);
            actionRef.current?.reload();
        } catch (error) {
            // Error already handled in request layer
        }
    };

    const columns: ProColumns<Class>[] = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            hideInSearch: true,
        },
        {
            title: '班级名称',
            dataIndex: 'name',
            key: 'name',
            copyable: true,
        },
        {
            title: '年级',
            dataIndex: 'grade',
            key: 'grade',
            width: 100,
            valueType: 'select',
            valueEnum: {
                1: { text: '1年级' },
                2: { text: '2年级' },
                3: { text: '3年级' },
                4: { text: '4年级' },
                5: { text: '5年级' },
                6: { text: '6年级' },
            },
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            hideInSearch: true,
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        编辑
                    </Button>
                    {isAdmin && (
                        <Popconfirm
                            title="确定要删除吗？"
                            onConfirm={() => handleDelete(record.id)}
                            okText="确定"
                            cancelText="取消"
                        >
                            <Button type="link" danger icon={<DeleteOutlined />}>
                                删除
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <ProTable<Class>
                headerTitle="班级管理"
                actionRef={actionRef}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                }}
                toolBarRender={() => isAdmin ? [
                    <Button
                        key="add"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                    >
                        添加班级
                    </Button>,
                ] : []}
                request={async (params) => {
                    try {
                        const data = await api.class.list();

                        // Apply search filters
                        let filteredData = data;

                        if (params.name) {
                            filteredData = filteredData.filter(cls =>
                                cls.name.toLowerCase().includes((params.name as string).toLowerCase())
                            );
                        }

                        if (params.grade) {
                            filteredData = filteredData.filter(cls =>
                                Number(cls.grade) === Number(params.grade)
                            );
                        }

                        // Apply pagination
                        const { current = 1, pageSize = 10 } = params;
                        const start = (current - 1) * pageSize;
                        const end = start + pageSize;
                        const paginatedData = filteredData.slice(start, end);

                        return {
                            data: paginatedData,
                            success: true,
                            total: filteredData.length,
                        };
                    } catch (error) {
                        return {
                            data: [],
                            success: false,
                            total: 0,
                        };
                    }
                }}
                columns={columns}
                pagination={{
                    pageSize: 10,
                    showTotal: (total: number) => `共 ${total} 条`,
                }}
            />

            <ModalForm
                title={editingClass ? '编辑班级' : '添加班级'}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onFinish={handleSubmit}
                initialValues={editingClass || {}}
                layout="vertical"
                modalProps={{
                    destroyOnClose: true,
                    width: '90%',
                    style: { maxWidth: 600 },
                }}
            >
                <ProFormText
                    label="班级名称"
                    name="name"
                    rules={[{ required: true, message: '请输入班级名称' }]}
                    placeholder="例如：一年级1班"
                />
                <ProFormSelect
                    label="年级"
                    name="grade"
                    rules={[{ required: true, message: '请选择年级' }]}
                    placeholder="请选择年级"
                    options={[1, 2, 3, 4, 5, 6].map((g) => ({
                        label: `${g}年级`,
                        value: g,
                    }))}
                />
            </ModalForm>
        </div>
    );
}
