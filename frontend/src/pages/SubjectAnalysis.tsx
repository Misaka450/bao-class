import { useState, useEffect } from 'react';
import { Card, Select, Spin, Typography, message, Row, Col, Empty } from 'antd';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAuthStore } from '../store/authStore';

const { Title } = Typography;

interface Student { id: number; name: string; }
interface RadarData { subject: string; score: number; classAvg: number; zScore: number; fullMark: number; }
interface TrendData { exam_name: string; exam_date: string; score: number; full_score: number; }

export default function SubjectAnalysis() {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [radarData, setRadarData] = useState<RadarData[]>([]);
    const [trendData, setTrendData] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(false);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchStudents();
    }, []);

    useEffect(() => {
        if (selectedStudentId) {
            fetchAnalysisData(selectedStudentId);
        }
    }, [selectedStudentId]);

    const fetchStudents = async () => {
        try {
            const res = await fetch('http://localhost:8787/api/students', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setStudents(data);
            if (data.length > 0) setSelectedStudentId(data[0].id.toString());
        } catch (error) {
            message.error('获取学生列表失败');
        }
    };

    const fetchAnalysisData = async (studentId: string) => {
        setLoading(true);
        try {
            // Fetch Radar Data
            const radarRes = await fetch(`http://localhost:8787/api/analysis/student/radar/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const radarJson = await radarRes.json();
            setRadarData(radarJson);

            // Fetch Trend Data
            const trendRes = await fetch(`http://localhost:8787/api/stats/student/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const trendJson = await trendRes.json();
            // Reverse to show oldest to newest
            setTrendData(Array.isArray(trendJson) ? trendJson.reverse() : []);

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
                    <Title level={2} style={{ margin: 0 }}>学生学科分析</Title>
                    <p style={{ margin: '4px 0 0 0', color: '#666' }}>深度分析学生学科优劣势及成绩走势</p>
                </div>
                <Select
                    value={selectedStudentId}
                    onChange={setSelectedStudentId}
                    style={{ width: 200 }}
                    placeholder="选择学生"
                    showSearch
                    filterOption={(input, option) =>
                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                    }
                >
                    {students.map((student) => (
                        <Select.Option key={student.id} value={student.id}>
                            {student.name}
                        </Select.Option>
                    ))}
                </Select>
            </div>

            <Spin spinning={loading}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Card title="学科能力雷达图 (Z-score)">
                            {radarData.length > 0 ? (
                                <div style={{ height: 400 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="subject" />
                                            <PolarRadiusAxis angle={30} domain={[-3, 3]} />
                                            <Radar
                                                name="Z-Score (标准分)"
                                                dataKey="zScore"
                                                stroke="#8884d8"
                                                fill="#8884d8"
                                                fillOpacity={0.6}
                                            />
                                            <Tooltip />
                                            <Legend />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <Empty description="暂无数据" />
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card title="总分走势">
                            {trendData.length > 0 ? (
                                <div style={{ height: 400 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="exam_name" />
                                            <YAxis domain={[0, 300]} />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="score" stroke="#82ca9d" name="总分" />
                                        </LineChart>
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
