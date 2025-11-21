import { useState, useEffect } from 'react';
import { Card, Select, Spin, Typography, message, Row, Col, Empty } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuthStore } from '../store/authStore';

const { Title } = Typography;

interface Exam { id: number; name: string; }
interface ComparisonData { name: string; average_score: number; pass_rate: number; excellent_rate: number; }
interface DistributionData { range: string; count: number;[key: string]: any; }

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function SubjectComparison() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
    const [distributionData, setDistributionData] = useState<DistributionData[]>([]);
    const [loading, setLoading] = useState(false);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchExams();
    }, []);

    useEffect(() => {
        if (selectedExamId) {
            fetchAnalysisData(selectedExamId);
        }
    }, [selectedExamId]);

    const fetchExams = async () => {
        try {
            const res = await fetch('http://localhost:8787/api/exams', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setExams(data);
            if (data.length > 0) setSelectedExamId(data[0].id.toString());
        } catch (error) {
            message.error('获取考试列表失败');
        }
    };

    const fetchAnalysisData = async (examId: string) => {
        setLoading(true);
        try {
            // Fetch Class Comparison
            const compRes = await fetch(`http://localhost:8787/api/stats/comparison/classes?examId=${examId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const compJson = await compRes.json();
            setComparisonData(compJson);

            // Fetch Score Distribution
            const distRes = await fetch(`http://localhost:8787/api/stats/exam/${examId}/distribution`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const distJson = await distRes.json();
            setDistributionData(distJson);

        } catch (error) {
            message.error('获取分析数据失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>学科横向对比</Title>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>多维度对比各班级考试成绩差异</p>
                </div>
                <Select
                    value={selectedExamId}
                    onChange={setSelectedExamId}
                    style={{ width: 200 }}
                    placeholder="选择考试"
                >
                    {exams.map((exam) => (
                        <Select.Option key={exam.id} value={exam.id}>
                            {exam.name}
                        </Select.Option>
                    ))}
                </Select>
            </div>

            <Spin spinning={loading}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Card title="班级平均分对比">
                            {comparisonData.length > 0 ? (
                                <div style={{ height: 400 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={comparisonData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="average_score" name="平均分" fill="#8884d8" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <Empty description="暂无数据" />
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card title="及格率与优秀率对比">
                            {comparisonData.length > 0 ? (
                                <div style={{ height: 400 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={comparisonData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="pass_rate" name="及格率 (%)" fill="#82ca9d" />
                                            <Bar dataKey="excellent_rate" name="优秀率 (%)" fill="#ffc658" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <Empty description="暂无数据" />
                            )}
                        </Card>
                    </Col>
                    <Col xs={24}>
                        <Card title="成绩分段统计">
                            {distributionData.length > 0 ? (
                                <div style={{ height: 400 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={distributionData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={true}
                                                label={({ name, percent }) => `${name}: ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                                                outerRadius={150}
                                                fill="#8884d8"
                                                dataKey="count"
                                                nameKey="range"
                                            >
                                                {distributionData.map((_entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <Empty description="暂无数据" />
                            )}
                        </Card>
                    </Col>
                </Row>
            </Spin>
        </div>
    );
}
