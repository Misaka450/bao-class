import { useState, useEffect } from 'react';
import { Card, Select, Spin, Typography, message, Row, Col, Empty, Tag, List, Button, Space } from 'antd';
import { FallOutlined, RiseOutlined, WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Title } = Typography;

interface AlertStudent {
    id: number;
    name: string;
    type: string;
    score?: number;
    subject?: string;
    drop_amount?: number;
    score_diff?: number;
    failed_score?: number;
}

interface FocusGroupData {
    critical: AlertStudent[];
    regressing: AlertStudent[];
    fluctuating: AlertStudent[];
    imbalanced: AlertStudent[];
}

interface ClassOption {
    id: number;
    name: string;
}

export default function ManagementAlerts() {
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [data, setData] = useState<FocusGroupData | null>(null);
    const [loading, setLoading] = useState(false);
    const token = useAuthStore((state) => state.token);
    const navigate = useNavigate();

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchAlerts(selectedClassId);
        }
    }, [selectedClassId]);

    const fetchClasses = async () => {
        try {
            const res = await fetch('http://localhost:8787/api/classes', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            setClasses(json);
            if (json.length > 0) {
                setSelectedClassId(json[0].id.toString());
            }
        } catch (error) {
            message.error('获取班级列表失败');
        }
    };

    const fetchAlerts = async (classId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:8787/api/analysis/class/focus/${classId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            setData(json);
        } catch (error) {
            message.error('获取预警信息失败');
        } finally {
            setLoading(false);
        }
    };

    const renderStudentList = (students: AlertStudent[], type: 'critical' | 'regressing' | 'fluctuating' | 'imbalanced') => {
        if (!students || students.length === 0) return <Empty description="无相关学生" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

        return (
            <List
                itemLayout="horizontal"
                dataSource={students}
                renderItem={(item) => (
                    <List.Item
                        actions={[<Button type="link" size="small" onClick={() => navigate(`/student/${item.id}`)}>查看</Button>]}
                    >
                        <List.Item.Meta
                            avatar={
                                type === 'critical' ? <WarningOutlined style={{ color: '#faad14' }} /> :
                                    type === 'regressing' ? <FallOutlined style={{ color: '#ff4d4f' }} /> :
                                        type === 'fluctuating' ? <RiseOutlined style={{ color: '#1890ff' }} /> :
                                            <ExclamationCircleOutlined style={{ color: '#722ed1' }} />
                            }
                            title={item.name}
                            description={
                                type === 'critical' ? (
                                    <span>
                                        <Tag color="orange">{item.subject}</Tag>
                                        分数: {item.score} (临界)
                                    </span>
                                ) : type === 'regressing' ? (
                                    <span style={{ color: '#ff4d4f' }}>
                                        近期下降: {Number(item.drop_amount).toFixed(1)} 分
                                    </span>
                                ) : type === 'fluctuating' ? (
                                    <span>
                                        分差波动: {item.score_diff} 分
                                    </span>
                                ) : (
                                    <span>
                                        <Tag color="purple">{item.subject}</Tag>
                                        不及格: {item.failed_score}
                                    </span>
                                )
                            }
                        />
                    </List.Item>
                )}
            />
        );
    };

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>管理预警</Title>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>智能识别需要关注的学生群体</p>
                </div>
                <Select
                    value={selectedClassId}
                    onChange={setSelectedClassId}
                    style={{ width: 200 }}
                    placeholder="选择班级"
                >
                    {classes.map((cls) => (
                        <Select.Option key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                        </Select.Option>
                    ))}
                </Select>
            </div>

            <Spin spinning={loading}>
                <Row gutter={[24, 24]}>
                    <Col xs={24} md={12} lg={6}>
                        <Card
                            title={<Space><WarningOutlined style={{ color: '#faad14' }} /> 临界生预警</Space>}
                            bordered={false}
                            style={{ height: '100%' }}
                        >
                            <div style={{ height: 400, overflowY: 'auto' }}>
                                {renderStudentList(data?.critical || [], 'critical')}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={12} lg={6}>
                        <Card
                            title={<Space><FallOutlined style={{ color: '#ff4d4f' }} /> 退步预警</Space>}
                            bordered={false}
                            style={{ height: '100%' }}
                        >
                            <div style={{ height: 400, overflowY: 'auto' }}>
                                {renderStudentList(data?.regressing || [], 'regressing')}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={12} lg={6}>
                        <Card
                            title={<Space><ExclamationCircleOutlined style={{ color: '#722ed1' }} /> 偏科预警</Space>}
                            bordered={false}
                            style={{ height: '100%' }}
                        >
                            <div style={{ height: 400, overflowY: 'auto' }}>
                                {renderStudentList(data?.imbalanced || [], 'imbalanced')}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={12} lg={6}>
                        <Card
                            title={<Space><RiseOutlined style={{ color: '#1890ff' }} /> 波动预警</Space>}
                            bordered={false}
                            style={{ height: '100%' }}
                        >
                            <div style={{ height: 400, overflowY: 'auto' }}>
                                {renderStudentList(data?.fluctuating || [], 'fluctuating')}
                            </div>
                        </Card>
                    </Col>
                </Row>
            </Spin>
        </div>
    );
}


