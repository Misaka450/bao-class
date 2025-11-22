import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../store/authStore';

interface Course {
    id: number;
    name: string;
    grade: number;
}

export default function Courses() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [form] = Form.useForm();
    const { token } = useAuthStore();

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/courses`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
            }
        } catch (error) {
            message.error('获取课程列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleAdd = () => {
        setEditingCourse(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record: Course) => {
        setEditingCourse(record);
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await fetch(`${API_BASE_URL}/api/courses/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            message.success('删除成功');
            fetchCourses();
        } catch (error) {
            message.error('删除失败');
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            const url = editingCourse
                ? `${API_BASE_URL}/api/courses/${editingCourse.id}`
                : `${API_BASE_URL}/api/courses`;
            const method = editingCourse ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(values),
            });

            message.success(editingCourse ? '更新成功' : '添加成功');
            setIsModalOpen(false);
            fetchCourses();
        } catch (error) {
            message.error('操作失败');
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

    const columns: ColumnsType<Course> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: '课程名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '年级',
            dataIndex: 'grade',
            key: 'grade',
            width: 100,
            render: (grade) => getGradeName(grade),
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
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
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>课程管理</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>管理学校开设的所有课程</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    添加课程
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={courses}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
            />

            <Modal
                title={editingCourse ? '编辑课程' : '添加课程'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    <Form.Item
                        label="课程名称"
                        name="name"
                        rules={[{ required: true, message: '请输入课程名称' }]}
                    >
                        <Input placeholder="例如：语文" />
                    </Form.Item>
                    <Form.Item
                        label="年级"
                        name="grade"
                        rules={[{ required: true, message: '请选择年级' }]}
                    >
                        <Select placeholder="请选择年级">
                            {[1, 2, 3, 4, 5, 6].map((g) => (
                                <Select.Option key={g} value={g}>
                                    {g}年级
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>取消</Button>
                            <Button type="primary" htmlType="submit">
                                {editingCourse ? '更新' : '添加'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
