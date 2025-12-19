import { useState, useRef } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ProTable, ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Space, Popconfirm, message } from 'antd';
import type { Course } from '../types';
import api from '../services/api';

export default function Courses() {
    const actionRef = useRef<ActionType>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);

    const handleAdd = () => {
        setEditingCourse(null);
        setIsModalOpen(true);
    };

    const handleEdit = (record: Course) => {
        setEditingCourse(record);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await api.course.delete(id);
            message.success('删除成功');
            actionRef.current?.reload();
        } catch (error) {
            // Error already handled in request layer
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            if (editingCourse) {
                await api.course.update(editingCourse.id, values);
                message.success('更新成功');
            } else {
                await api.course.create(values);
                message.success('添加成功');
            }
            setIsModalOpen(false);
            actionRef.current?.reload();
        } catch (error) {
            // Error already handled in request layer
        }
    };

    const getGradeName = (grade: number) => {
        const mapping: Record<number, string> = {
            1: '一年级',
            2: '二年级',
            3: '三年级',
            4: '四年级',
            5: '五年级',
            6: '六年级',
        };
        return mapping[grade] || `${grade}年级`;
    };

    const columns: ProColumns<Course>[] = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            hideInSearch: true,
        },
        {
            title: '课程名称',
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
                1: { text: '一年级' },
                2: { text: '二年级' },
                3: { text: '三年级' },
                4: { text: '四年级' },
                5: { text: '五年级' },
                6: { text: '六年级' },
            },
            render: (_, record) => getGradeName(Number(record.grade)),
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
                </Space>
            ),
        },
    ];

    return (
        <div>
            <ProTable<Course>
                headerTitle="课程管理"
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
                        onClick={handleAdd}
                    >
                        添加课程
                    </Button>,
                ]}
                request={async (params) => {
                    try {
                        const data = await api.course.list();

                        // Apply search filters
                        let filteredData = data;

                        if (params.name) {
                            filteredData = filteredData.filter(course =>
                                course.name.includes(params.name as string)
                            );
                        }

                        if (params.grade) {
                            filteredData = filteredData.filter(course =>
                                Number(course.grade) === Number(params.grade)
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
                title={editingCourse ? '编辑课程' : '添加课程'}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onFinish={handleSubmit}
                initialValues={editingCourse || {}}
                layout="vertical"
                width={600}
                modalProps={{
                    destroyOnClose: true,
                }}
            >
                <ProFormText
                    label="课程名称"
                    name="name"
                    rules={[{ required: true, message: '请输入课程名称' }]}
                    placeholder="例如：语文"
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
