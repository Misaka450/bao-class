import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { ProTable, ProForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Button, Modal, Space, Popconfirm, message } from 'antd';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import type { Student, Class } from '../types';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import useMobileTable from '../hooks/useMobileTable';

export default function Students() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { tableProps } = useMobileTable<Student>();
    const canDelete = user?.role === 'admin' || user?.role === 'head_teacher';
    const actionRef = useRef<ActionType>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formRef] = ProForm.useForm();

    useEffect(() => {
        const fetchClassesLocal = async () => {
            try {
                const data = await api.class.list();
                setClasses(data);
            } catch (error) {
                // Error already handled
            }
        };
        fetchClassesLocal();
    }, []);

    const handleAdd = () => {
        setEditingStudent(null);
        formRef.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record: Student) => {
        setEditingStudent(record);
        formRef.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await api.student.delete(id);
            message.success('删除成功');
            actionRef.current?.reload();
        } catch (error) {
            // Error already handled
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            if (editingStudent) {
                await api.student.update(editingStudent.id, values);
                message.success('更新成功');
            } else {
                await api.student.create(values);
                message.success('添加成功');
            }
            setIsModalOpen(false);
            actionRef.current?.reload();
        } catch (error) {
            // Error already handled
        }
    };

    const columns: ProColumns<Student>[] = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            hideInSearch: true,
        },
        {
            title: '姓名',
            dataIndex: 'name',
            key: 'name',
            copyable: true,
        },
        {
            title: '学号',
            dataIndex: 'student_id',
            key: 'student_id',
            copyable: true,
        },
        {
            title: '班级',
            dataIndex: 'class_id',
            key: 'class_id',
            valueType: 'select',
            valueEnum: classes.reduce((acc, cls) => {
                acc[cls.id] = { text: cls.name };
                return acc;
            }, {} as Record<number, { text: string }>),
            render: (_, record) => {
                const cls = classes.find((c) => c.id === record.class_id);
                return cls?.name || record.class_id;
            },
        },
        {
            title: '操作',
            key: 'action',
            width: 200,
            hideInSearch: true,
            render: (_, record) => {
                const isAuthorized = user?.role === 'admin' ||
                    (user?.authorizedClassIds === 'ALL' || user?.authorizedClassIds?.includes(record.class_id));

                // 只有管理员或该班班主任可以删除学生
                const canDeleteThis = user?.role === 'admin' || (user?.role === 'head_teacher' && isAuthorized);

                return (
                    <Space>
                        <Button
                            type="link"
                            icon={<UserOutlined />}
                            onClick={() => navigate(`/student-profile/${record.id}`)}
                        >
                            档案
                        </Button>
                        <Button
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                            disabled={!isAuthorized}
                        >
                            编辑
                        </Button>
                        {canDeleteThis && (
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
                );
            },
        },
    ];

    return (
        <div>
            <ProTable<Student>
                {...tableProps}
                headerTitle="学生管理"
                actionRef={actionRef}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                    ...tableProps.search,
                }}
                toolBarRender={() => [
                    <Button
                        key="add"
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                    >
                        添加学生
                    </Button>,
                ]}
                request={async (params) => {
                    try {
                        const data = await api.student.list();

                        let filteredData = data;
                        if (params.name) {
                            filteredData = filteredData.filter(student =>
                                student.name.includes(params.name as string)
                            );
                        }
                        if (params.student_id) {
                            filteredData = filteredData.filter(student =>
                                student.student_id.includes(params.student_id as string)
                            );
                        }
                        if (params.class_id) {
                            filteredData = filteredData.filter(student =>
                                student.class_id === Number(params.class_id)
                            );
                        }

                        const { current = 1, pageSize = 10 } = params;
                        const start = (current - 1) * pageSize;
                        const end = start + pageSize;
                        return {
                            data: filteredData.slice(start, end),
                            success: true,
                            total: filteredData.length,
                        };
                    } catch (error) {
                        return { data: [], success: false, total: 0 };
                    }
                }}
                columns={columns}
                pagination={{
                    pageSize: 10,
                    showTotal: (total) => `共 ${total} 条`,
                }}
            />

            <Modal
                title={editingStudent ? '编辑学生' : '添加学生'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width="90%"
                style={{ maxWidth: 600 }}
            >
                <ProForm
                    form={formRef}
                    onFinish={handleSubmit}
                    layout="vertical"
                    initialValues={editingStudent || {}}
                    submitter={{
                        render: (props) => (
                            <div style={{ textAlign: 'right' }}>
                                <Space>
                                    <Button onClick={() => setIsModalOpen(false)}>取消</Button>
                                    <Button type="primary" onClick={() => props.form?.submit?.()}>
                                        {editingStudent ? '更新' : '添加'}
                                    </Button>
                                </Space>
                            </div>
                        ),
                    }}
                >
                    <ProFormText
                        label="姓名"
                        name="name"
                        rules={[{ required: true, message: '请输入学生姓名' }]}
                    />
                    <ProFormText
                        label="学号"
                        name="student_id"
                        rules={[{ required: true, message: '请输入学号' }]}
                    />
                    <ProFormSelect
                        label="班级"
                        name="class_id"
                        rules={[{ required: true, message: '请选择班级' }]}
                        options={classes.map((cls) => ({ label: cls.name, value: cls.id }))}
                    />
                </ProForm>
            </Modal>
        </div>
    );
}
