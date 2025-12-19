import { useState, useEffect, useMemo } from 'react';
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
            setSelectedClassId(classes[0].id.toString());
        }
    }, [classes, selectedClassId]);

    const { data, isLoading: loadingAlerts } = useFocusGroup(selectedClassId || undefined);

    const loading = loadingClasses || loadingAlerts;

    // 按学科对临界生进行分组
    const criticalBySubject = useMemo(() => {
        const groups: { [key: string]: AlertStudent[] } = {};
        (data?.critical || []).forEach(item => {
            const subject = item.subject || '其他';
            if (!groups[subject]) groups[subject] = [];
            groups[subject].push(item);
        });
        return groups;
    }, [data?.critical]);

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
                    {/* 临界生预警 - 改为全宽并按学科分列 */}
                    <Col span={24}>
                        <Card
                            title={<Space><WarningOutlined style={{ color: '#faad14' }} /> 临界生预警 (按学科分列)</Space>}
                            bordered={false}
                        >
                            <div style={{ minHeight: 150, maxHeight: 500, overflowY: 'auto' }}>
                                {Object.keys(criticalBySubject).length > 0 ? (
                                    <Row gutter={24}>
                                        {Object.keys(criticalBySubject).sort().map(subject => (
                                            <Col xs={24} md={8} key={subject}>
                                                <div style={{
                                                    fontWeight: 'bold',
                                                    marginBottom: 12,
                                                    paddingBottom: 8,
                                                    borderBottom: '2px solid #f0f0f0',
                                                    color: '#1890ff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <span>{subject}</span>
                                                    <Tag color="blue">{criticalBySubject[subject].length} 人</Tag>
                                                </div>
                                                {renderStudentList(criticalBySubject[subject], 'critical')}
                                            </Col>
                                        ))}
                                    </Row>
                                ) : (
                                    <Empty description="无临界生数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                )}
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} md={8}>
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
                    <Col xs={24} md={8}>
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
                    <Col xs={24} md={8}>
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
