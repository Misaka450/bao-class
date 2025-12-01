import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Student, Class } from '../types';
import api from '../services/api';

export default function Students() {
    const navigate = useNavigate();
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState('');
    const [filterClassId, setFilterClassId] = useState<string>('');

    useEffect(() => {
        fetchStudents();
        fetchClasses();
    }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const data = await api.student.list();
            setStudents(data);
        } catch (error) {
            // Error already handled in request layer
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const data = await api.class.list();
            setClasses(data);
        } catch (error) {
            // Error already handled in request layer
        }
    };

    const handleAdd = () => {
        setEditingStudent(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record: Student) => {
        setEditingStudent(record);
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await api.student.delete(id);
            message.success('删除成功');
            fetchStudents();
        } catch (error) {
            // Error already handled in request layer
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
            fetchStudents();
        } catch (error) {
            // Error already handled in request layer
        }
    };

    // Optimize: memoize class name rendering
    const renderClassName = useCallback((classId: number) => {
        const cls = classes.find((c) => c.id === classId);
        return cls?.name || classId;
    }, [classes]);

    // Optimize: memoize columns definition
    const columns: ColumnsType<Student> = useMemo(() => [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: '姓名',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '学号',
            dataIndex: 'student_id',
            key: 'student_id',
        },
        {
            title: '班级',
            dataIndex: 'class_id',
            key: 'class_id',
            render: renderClassName,
        },
        {
            title: '操作',
            key: 'action',
            width: 150,
            render: (_, record) => (
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
    ], [renderClassName, navigate]);

    // Optimize: memoize filtered students
    const filteredStudents = useMemo(() =>
        students.filter(student => {
            const matchesSearch = searchText === '' ||
                student.name.toLowerCase().includes(searchText.toLowerCase()) ||
                student.student_id.toLowerCase().includes(searchText.toLowerCase());
            const matchesClass = filterClassId === '' || student.class_id.toString() === filterClassId;
            return matchesSearch && matchesClass;
        }),
        [students, searchText, filterClassId]
    );

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>学生管理</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>管理所有在校学生信息</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    添加学生
                </Button>
            </div>

            {/* Search and Filter Section */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Input
                        placeholder="搜索姓名或学号"
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                    />
                </Col>
                <Col span={8}>
                    <Select
                        placeholder="筛选班级"
                        value={filterClassId}
                        onChange={setFilterClassId}
                        style={{ width: '100%' }}
                        allowClear
                    >
                        {classes.map((cls) => (
                            <Select.Option key={cls.id} value={cls.id.toString()}>{cls.name}</Select.Option>
                        ))}
                    </Select>
                </Col>
            </Row>

            <Table
                columns={columns}
                dataSource={filteredStudents}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
            />

            <Modal
                title={editingStudent ? '编辑学生' : '添加学生'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    <Form.Item
                        label="姓名"
                        name="name"
                        rules={[{ required: true, message: '请输入学生姓名' }]}
                    >
                        <Input placeholder="例如：张三" />
                    </Form.Item>
                    <Form.Item
                        label="学号"
                        name="student_id"
                        rules={[{ required: true, message: '请输入学号' }]}
                    >
                        <Input placeholder="例如：S1001" />
                    </Form.Item>
                    <Form.Item
                        label="班级"
                        name="class_id"
                        rules={[{ required: true, message: '请选择班级' }]}
                    >
                        <Select placeholder="请选择班级">
                            {classes.map((cls) => (
                                <Select.Option key={cls.id} value={cls.id}>
                                    {cls.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>取消</Button>
                            <Button type="primary" htmlType="submit">
                                {editingStudent ? '更新' : '添加'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
