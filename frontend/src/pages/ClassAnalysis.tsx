import { useState, useEffect } from 'react';
import { Card, Select, Spin, Typography, message, Row, Col, Empty } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../config';

const { Title } = Typography;

interface ClassTrendData {
    class_name: string;
    trends: {
        exam_name: string;
        exam_date: string;
        average_score: number;
        pass_rate: number;
        excellent_rate: number;
    }[];
}

interface ClassOption {
    id: number;
    name: string;
}

export default function ClassAnalysis() {
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [data, setData] = useState<ClassTrendData | null>(null);
    const [loading, setLoading] = useState(false);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchTrend(selectedClassId);
        }
    }, [selectedClassId]);

    const fetchClasses = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/classes`, {
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

    const fetchTrend = async (classId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/stats/class-trend/${classId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            setData(json);
        } catch (error) {
            message.error('获取班级走势失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>班级成绩走势</Title>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>分析班级在历次考试中的平均分及及格率变化</p>
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
                {data && data.trends && data.trends.length > 0 ? (
                    <Row gutter={[24, 24]}>
                        <Col span={24}>
                            <Card title="平均分走势" bordered={false}>
                                <div style={{ height: 350 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.trends}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="exam_name" />
                                            <YAxis domain={[0, 'auto']} />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="average_score" name="平均分" stroke="#1890ff" strokeWidth={3} activeDot={{ r: 8 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                        <Col span={24}>
                            <Card title="及格率与优秀率走势 (%)" bordered={false}>
                                <div style={{ height: 350 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.trends}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="exam_name" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Legend />
                                            <Area type="monotone" dataKey="pass_rate" name="及格率" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                                            <Area type="monotone" dataKey="excellent_rate" name="优秀率" stackId="2" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                ) : (
                    <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
            </Spin>
        </div>
    );
}
