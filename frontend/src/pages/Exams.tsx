import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../store/authStore';

interface ExamCourse {
    course_id: number;
    course_name: string;
}

interface Exam {
    id: number;
    name: string;
    class_id: number;
    class_name: string;
    exam_date: string;
    courses: ExamCourse[];
    description?: string;
}

interface Class {
    id: number;
    name: string;
}

interface Course {
    id: number;
    name: string;
}

export default function Exams() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [form] = Form.useForm();
    const { token } = useAuthStore();

    const fetchExams = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/exams`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setExams(data);
            }
        } catch (error) {
            message.error('获取考试列表失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/classes`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setClasses(data);
            }
        } catch (error) {
            console.error('Failed to fetch classes');
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/courses`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
            }
        } catch (error) {
            console.error('Failed to fetch courses');
        }
    };

    useEffect(() => {
        fetchExams();
        fetchClasses();
        fetchCourses();
    }, []);

    const handleAdd = () => {
        setEditingExam(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record: Exam) => {
        setEditingExam(record);
        form.setFieldsValue({
            ...record,
            exam_date: dayjs(record.exam_date),
            course_ids: record.courses.map(c => c.course_id)
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await fetch(`${API_BASE_URL}/api/exams/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            message.success('删除成功');
            fetchExams();
        } catch (error) {
            message.error('删除失败');
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            const url = editingExam
                ? `${API_BASE_URL}/api/exams/${editingExam.id}`
                : `${API_BASE_URL}/api/exams`;
            const method = editingExam ? 'PUT' : 'POST';

            const data = {
                ...values,
                exam_date: values.exam_date.format('YYYY-MM-DD'),
            };

            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            message.success(editingExam ? '更新成功' : '添加成功');
            setIsModalOpen(false);
            fetchExams();
        } catch (error) {
            message.error('操作失败');
        }
    };

    const columns: ColumnsType<Exam> = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
        { title: '考试名称', dataIndex: 'name', key: 'name' },
        {
            title: '包含科目',
            dataIndex: 'courses',
            key: 'courses',
            render: (courses: ExamCourse[]) => (
                <>
                    {courses.map((c) => (
                        <Tag key={c.course_id} color="blue">
                            {c.course_name}
                        </Tag>
                    ))}
                </>
            ),
        },
        { title: '考试日期', dataIndex: 'exam_date', key: 'exam_date' },
        {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_, record) => (
                <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
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
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>考试管理</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>管理所有考试信息（支持多科目）</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    添加考试
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={exams}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
            />

            <Modal
                title={editingExam ? '编辑考试' : '添加考试'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={600}
            >
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    <Form.Item label="考试名称" name="name" rules={[{ required: true, message: '请输入考试名称' }]}>
                        <Input placeholder="例如：2024年秋季期中考试" />
                    </Form.Item>
                    <Form.Item
                        label="包含科目"
                        name="course_ids"
                        rules={[{ required: true, message: '请至少选择一个科目' }]}
                        tooltip="一次考试可以包含多个科目"
                    >
                        <Select
                            mode="multiple"
                            placeholder="请选择科目（可多选）"
                            maxTagCount="responsive"
                        >
                            {courses.map((c) => (
                                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label="考试日期" name="exam_date" rules={[{ required: true, message: '请选择考试日期' }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item label="备注说明" name="description">
                        <Input.TextArea rows={3} placeholder="例如：一年级1班期中考试" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>取消</Button>
                            <Button type="primary" htmlType="submit">
                                {editingExam ? '更新' : '添加'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
