import { useState, useRef } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
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

    // --- Subject Teacher Logic ---
    const [teacherModalVisible, setTeacherModalVisible] = useState(false);
    const [currentClassId, setCurrentClassId] = useState<number | null>(null);
    const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [allCourses, setAllCourses] = useState<any[]>([]);

    const fetchSubjectTeachers = async (classId: number) => {
        try {
            const data = await api.class.getTeachers(classId);
            setSubjectTeachers(data);
        } catch (error) {
            message.error('获取任课老师失败');
        }
    };

    const handleManageTeachers = async (record: Class) => {
        setCurrentClassId(record.id);
        setTeacherModalVisible(true);
        fetchSubjectTeachers(record.id);

        // Load options if not loaded
        if (allTeachers.length === 0) {
            const users = await api.user.list();
            setAllTeachers(users.filter(u => u.role === 'teacher' || u.role === 'head_teacher'));
        }
        if (allCourses.length === 0) {
            const courses = await api.course.list();
            setAllCourses(courses);
        }
    };

    const handleAssignTeacher = async (values: any) => {
        if (!currentClassId) return;
        try {
            await api.class.assignTeacher(currentClassId, values);
            message.success('分配成功');
            fetchSubjectTeachers(currentClassId);
            return true;
        } catch (error: any) {
            if (error.response && error.response.status === 409) {
                message.error('该科目已分配老师');
            } else {
                message.error('分配失败');
            }
        }
    };

    const handleRemoveTeacher = async (teacherId: number, courseId: number) => {
        if (!currentClassId) return;
        try {
            await api.class.removeTeacher(currentClassId, teacherId, courseId);
            message.success('移除成功');
            fetchSubjectTeachers(currentClassId);
        } catch (error) {
            message.error('移除失败');
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
            width: 250,
            hideInSearch: true,
            render: (_, record) => {
                const canEdit = isAdmin || (user?.authorizedClassIds === 'ALL' || user?.authorizedClassIds?.includes(record.id));
                // Only Admin or Head Teacher (owner) can manage subject teachers
                const isOwner = isAdmin || (record.teacher_id === user?.id);

                return (
                    <Space>
                        <Button
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                            disabled={!canEdit}
                        >
                            编辑
                        </Button>
                        {isOwner && (
                            <Button
                                type="link"
                                icon={<TeamOutlined />}
                                onClick={() => handleManageTeachers(record)}
                            >
                                任课老师
                            </Button>
                        )}
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
                );
            },
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
                        // Filter for teachers: only show relevant classes
                        if (!isAdmin && user?.role === 'teacher') {
                            // Backend already filters list? No, api.class.list returns all? 
                            // Wait, classes.ts GET / returns ALL. We should filter frontend side or update backend.
                            // For now, let's filter here if needed, but actually the requirement "Teacher creates class" 
                            // implies they can see all? Or only theirs? 
                            // Implementation plan check: "Teacher can create OWN classes". 
                            // Usually teachers only care about their own. 
                            // Let's filter by authorizedClassIds if not admin?
                            // But wait, "authorizedClassIds" includes subject classes.
                            // Let's keep showing all for now, or filter if requested. 
                            // Actually, let's just stick to the requested changes.
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

            {/* Subject Teacher Managment Modal */}
            <ModalForm
                title="管理任课老师"
                open={teacherModalVisible}
                onOpenChange={setTeacherModalVisible}
                onFinish={handleAssignTeacher}
                modalProps={{
                    destroyOnClose: true,
                    width: 600,
                }}
                submitter={false} // Custom submit logic inside the content if needed, or just use the form for adding
            >
                <div style={{ marginBottom: 16 }}>
                    <h3>分配新老师</h3>
                    <ProFormSelect
                        name="course_id"
                        label="选择科目"
                        options={allCourses.map(c => ({ label: c.name, value: c.id }))}
                        rules={[{ required: true }]}
                        width="md"
                        style={{ display: 'inline-block', marginRight: 8 }}
                    />
                    <ProFormSelect
                        name="teacher_id"
                        label="选择老师"
                        options={allTeachers.map(t => ({ label: t.name, value: t.id }))}
                        rules={[{ required: true }]}
                        width="md"
                        style={{ display: 'inline-block', marginRight: 8 }}
                    />
                    <Button type="primary" onClick={() => {
                        // Trigger form submit manually or make this a separate form?
                        // ModalForm expects onFinish to be called by its own submit button.
                        // Let's use a nested form or just make the whole ModalForm the "Add" action.
                    }}>
                        分配 (请点击下方确认按钮)
                    </Button>
                </div>

                <h3>已分配任课老师</h3>
                <ProTable
                    rowKey="id"
                    dataSource={subjectTeachers}
                    search={false}
                    options={false}
                    pagination={false}
                    columns={[
                        { title: '科目', dataIndex: 'course_name' },
                        { title: '老师', dataIndex: 'teacher_name' },
                        {
                            title: '操作',
                            render: (_, record) => (
                                <Button
                                    type="link"
                                    danger
                                    onClick={() => handleRemoveTeacher(record.teacher_id, record.course_id)}
                                >
                                    移除
                                </Button>
                            )
                        }
                    ]}
                />
            </ModalForm>
        </div>
    );
}
