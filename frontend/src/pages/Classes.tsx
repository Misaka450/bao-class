import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../store/authStore';

interface Class {
    id: number;
    name: string;
    grade: number;
    teacher_id?: number;
}

export default function Classes() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState('');
    const [filterGrade, setFilterGrade] = useState<string>('');
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8787/api/classes', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setClasses(data);
        } catch (error) {
            message.error('获取班级列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingClass(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record: Class) => {
        setEditingClass(record);
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await fetch(`http://localhost:8787/api/classes/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            message.success('删除成功');
            fetchClasses();
        } catch (error) {
            message.error('删除失败');
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            const url = editingClass
                ? `http://localhost:8787/api/classes/${editingClass.id}`
                : 'http://localhost:8787/api/classes';
            const method = editingClass ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(values),
            });

            message.success(editingClass ? '更新成功' : '添加成功');
            setIsModalOpen(false);
            fetchClasses();
        } catch (error) {
            message.error('操作失败');
        }
    };

    const columns: ColumnsType<Class> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: '班级名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '年级',
            dataIndex: 'grade',
            key: 'grade',
            width: 100,
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
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>班级管理</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>管理学校所有班级信息</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    添加班级
                </Button>
            </div>

            {/* Search and Filter Section */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Input
                        placeholder="搜索班级名称"
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                    />
                </Col>
                <Col span={8}>
                    <Select
                        placeholder="筛选年级"
                        value={filterGrade}
                        onChange={setFilterGrade}
                        style={{ width: '100%' }}
                        allowClear
                    >
                        {[1, 2, 3, 4, 5, 6].map((g) => (
                            <Select.Option key={g} value={g.toString()}>{g}年级</Select.Option>
                        ))}
                    </Select>
                </Col>
            </Row>

            <Table
                columns={columns}
                dataSource={classes.filter(cls => {
                    const matchesSearch = searchText === '' ||
                        cls.name.toLowerCase().includes(searchText.toLowerCase());
                    const matchesGrade = filterGrade === '' || cls.grade.toString() === filterGrade;
                    return matchesSearch && matchesGrade;
                })}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
            />

            <Modal
                title={editingClass ? '编辑班级' : '添加班级'}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    <Form.Item
                        label="班级名称"
                        name="name"
                        rules={[{ required: true, message: '请输入班级名称' }]}
                    >
                        <Input placeholder="例如：一年级1班" />
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
                                {editingClass ? '更新' : '添加'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
