import { useState, useEffect, useRef } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { ProTable, ModalForm, ProFormText, ProFormSelect, ProFormDatePicker, ProFormTextArea } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Button, Space, Popconfirm, Tag, message } from 'antd';
import dayjs from 'dayjs';
import type { Exam, Course, Class } from '../types';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import useMobileTable from '../hooks/useMobileTable';

export default function Exams() {
    const actionRef = useRef<ActionType>(null);
    const { user } = useAuthStore();
    const { tableProps } = useMobileTable<Exam>();
    const canDelete = user?.role === 'admin' || user?.role === 'head_teacher';
    const [classes, setClasses] = useState<Class[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);

    const fetchClasses = async () => {
        try {
            const data = await api.class.list();
            setClasses(data);
        } catch (error) {
            // Error already handled in request layer
        }
    };

    const fetchCourses = async () => {
        try {
            const data = await api.course.list();
            setCourses(data);
        } catch (error) {
            // Error already handled in request layer
        }
    };

    const fetchData = async () => {
        await fetchClasses();
        await fetchCourses();
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setEditingExam(null);
        setIsModalOpen(true);
    };

    const handleEdit = (record: Exam) => {
        setEditingExam({
            ...record,
            exam_date: record.exam_date ? dayjs(record.exam_date) : null, // Convert string to dayjs for editing
            course_ids: record.courses?.map(c => c.course_id) || []
        } as any);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await api.exam.delete(id);
            message.success('删除成功');
            actionRef.current?.reload();
        } catch (error) {
            // Error already handled in request layer
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            let examDateValue = values.exam_date;
            
            // Handle both dayjs object and string formats
            if (typeof examDateValue === 'string') {
                examDateValue = dayjs(examDateValue);
            }
            
            // Ensure it's a valid dayjs object before formatting
            if (!examDateValue || typeof examDateValue.format !== 'function') {
                message.error('日期格式无效，请重新选择');
                return;
            }
            
            const data = {
                ...values,
                exam_date: examDateValue.format('YYYY-MM-DD'),
                courses: values.course_ids.map((courseId: number) => ({
                    course_id: courseId,
                    full_score: 100
                })),
            };
            delete data.course_ids;

            if (editingExam) {
                await api.exam.update(editingExam.id, data);
                message.success('更新成功');
            } else {
                await api.exam.create(data);
                message.success('添加成功');
            }
            setIsModalOpen(false);
            actionRef.current?.reload();
        } catch (error: any) {
            console.error('Submit error:', error);
            const errorMessage = error?.message || '操作失败，请重试';
            message.error(errorMessage);
        }
    };

    const columns: ProColumns<Exam>[] = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            hideInSearch: true,
        },
        {
            title: '考试名称',
            dataIndex: 'name',
            key: 'name',
            copyable: true,
        },
        {
            title: '包含科目',
            dataIndex: 'courses',
            key: 'courses',
            hideInSearch: true,
            render: (_, record) => (
                <>
                    {record.courses?.map((c) => (
                        <Tag key={c.course_id} color="blue">
                            {c.course_name}
                        </Tag>
                    ))}
                </>
            ),
        },
        {
            title: '考试日期',
            dataIndex: 'exam_date',
            key: 'exam_date',
            valueType: 'date',
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            hideInSearch: true,
            render: (_, record) => {
                const isAdmin = user?.role === 'admin';
                const isAuthorized = isAdmin || (user?.authorizedClassIds === 'ALL' || user?.authorizedClassIds?.includes(record.class_id));
                const canDeleteThis = isAdmin || (user?.role === 'head_teacher' && isAuthorized);

                return (
                    <Space>
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
            <ProTable<Exam>
                {...tableProps}
                headerTitle="考试管理"
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
                        添加考试
                    </Button>,
                ]}
                request={async (params) => {
                    try {
                        const data = await api.exam.list();

                        // Apply search filters
                        let filteredData = data;

                        if (params.name) {
                            filteredData = filteredData.filter(exam =>
                                exam.name.includes(params.name as string)
                            );
                        }

                        if (params.exam_date) {
                            filteredData = filteredData.filter(exam =>
                                exam.exam_date === params.exam_date
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
                title={editingExam ? '编辑考试' : '添加考试'}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onFinish={handleSubmit}
                initialValues={editingExam || {}}
                layout="vertical"
                submitter={{
                    render: (props, defaultDoms) => [
                        defaultDoms[0],
                        defaultDoms[1],
                    ],
                }}
                modalProps={{
                    destroyOnClose: true,
                    width: '90%',
                    style: { maxWidth: 600 },
                }}
            >
                <ProFormText
                    label="考试名称"
                    name="name"
                    rules={[{ required: true, message: '请输入考试名称' }]}
                    placeholder="例如：2024年秋季期中考试"
                />
                <ProFormSelect
                    label="班级"
                    name="class_id"
                    rules={[{ required: true, message: '请选择班级' }]}
                    placeholder="请选择班级"
                    options={classes.map((c) => ({
                        label: c.name,
                        value: c.id,
                    }))}
                />
                <ProFormSelect
                    label="包含科目"
                    name="course_ids"
                    rules={[{ required: true, message: '请至少选择一个科目' }]}
                    placeholder="请选择科目（可多选）"
                    mode="multiple"
                    options={courses.map((c) => ({
                        label: c.name,
                        value: c.id,
                    }))}
                    tooltip="一次考试可以包含多个科目"
                />
                <ProFormDatePicker
                    label="考试日期"
                    name="exam_date"
                    rules={[{ required: true, message: '请选择考试日期' }]}
                    width="100%"
                />
                <ProFormTextArea
                    label="备注说明"
                    name="description"
                    placeholder="例如：一年级1班期中考试"
                    fieldProps={{
                        rows: 3,
                    }}
                />
            </ModalForm>
        </div>
    );
}
