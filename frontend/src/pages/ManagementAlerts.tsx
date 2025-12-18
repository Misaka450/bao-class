import { useState, useEffect } from 'react';
import { Card, Select, Spin, Typography, Row, Col, Empty, Tag, List, Button, Space } from 'antd';
import { FallOutlined, RiseOutlined, WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { AlertStudent } from '../types';
import { useClassList } from '../hooks/useClassList';
import { useFocusGroup } from '../hooks/useFocusGroup';

const { Title } = Typography;

export default function ManagementAlerts() {
    const navigate = useNavigate();
    const [selectedClassId, setSelectedClassId] = useState<string>('');

    const { data: classes = [], isLoading: loadingClasses } = useClassList();

    useEffect(() => {
        if (classes.length > 0 && !selectedClassId) {
            setTimeout(() => setSelectedClassId(classes[0].id.toString()), 0);
        }
    }, [classes, selectedClassId]);

    const { data, isLoading: loadingAlerts } = useFocusGroup(selectedClassId || undefined);

    const loading = loadingClasses || loadingAlerts;

    const renderStudentList = (students: AlertStudent[], type: 'critical' | 'regressing' | 'fluctuating' | 'imbalanced') => {
        if (!students || students.length === 0) return <Empty description="无相关学生" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

        return (
            <List
                itemLayout="horizontal"
                dataSource={students}
                renderItem={(item) => (
                    <List.Item
                        actions={[<Button type="link" size="small" onClick={() => navigate(`/student-profile/${item.id}`)}>查看</Button>]}
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
                                        <Tag color="blue">{item.subject}</Tag>
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
                    loading={loadingClasses}
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
