import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Table, Tag, Spin, message, Statistic, Button, Progress, Empty, Modal, Input, List, Popconfirm } from 'antd';
import { ArrowLeftOutlined, RiseOutlined, FallOutlined, WarningOutlined, TrophyOutlined, RobotOutlined, ReloadOutlined, ClockCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import api from '../services/api';
import { useStudentProfile } from '../hooks/useStudentProfile';

const { Title, Text, Paragraph } = Typography;

export default function StudentProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data, isLoading: loading, error } = useStudentProfile(id ? Number(id) : undefined);
    const [aiComment, setAiComment] = useState<string>('');
    const [generatingComment, setGeneratingComment] = useState(false);
    const [commentHistory, setCommentHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [commentSource, setCommentSource] = useState<string>('');

    useEffect(() => {
        if (error) {
            message.error('获取学生档案失败');
        }
    }, [error]);

    // Load comment history when component mounts
    useEffect(() => {
        if (data?.student?.id) {
            loadCommentHistory();
        }
    }, [data?.student?.id]);

    const loadCommentHistory = async () => {
        if (!data?.student?.id) return;
        setLoadingHistory(true);
        try {
            const res = await api.ai.getCommentHistory(data.student.id);
            if (res.success) {
                setCommentHistory(res.comments);
            }
        } catch (error) {
            console.error('Load comment history error:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleGenerateComment = async () => {
        if (!data?.student?.id) return;

        setGeneratingComment(true);
        setCommentSource('');
        
        // Check if we're regenerating (there's already a comment)
        const isRegenerating = !!aiComment;
        
        setAiComment(''); // Clear previous comment after checking
        
        try {
            const res = await api.ai.generateComment({
                student_id: data.student.id,
                force_regenerate: isRegenerating // Pass force_regenerate flag when regenerating
            });
            if (res.success) {
                setAiComment(res.comment);
                setCommentSource(res.cached ? `缓存 (${res.source === 'kv' ? 'KV' : '数据库'})` : 'AI 生成');
                if (res.cached) {
                    message.success('评语加载成功（来自缓存）');
                } else {
                    message.success('评语生成成功');
                    // Reload history after new generation
                    await loadCommentHistory();
                }
            } else {
                message.error('评语生成失败，请稍后重试');
            }
        } catch (error) {
            console.error('Generate comment error:', error);
            message.error('评语生成失败，请稍后重试');
        } finally {
            setGeneratingComment(false);
        }
    };

    const handleEditComment = (id: number, text: string) => {
        setEditingCommentId(id);
        setEditingCommentText(text);
    };

    const handleSaveEdit = async () => {
        if (!editingCommentId) return;
        try {
            await api.ai.updateComment(editingCommentId, editingCommentText);
            message.success('评语已更新');
            setEditingCommentId(null);
            await loadCommentHistory();
        } catch (error) {
            message.error('更新失败');
        }
    };

    const handleDeleteComment = async (id: number) => {
        try {
            await api.ai.deleteComment(id);
            message.success('评语已删除');
            await loadCommentHistory();
        } catch (error) {
            message.error('删除失败');
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
    if (!data) return <div style={{ textAlign: 'center', marginTop: 100 }}>未找到学生数据</div>;

    // Calculate trends
    const latestRank = data.history.length > 0 ? data.history[data.history.length - 1].class_rank : '-';
    const prevRank = data.history.length > 1 ? data.history[data.history.length - 2].class_rank : null;
    const rankDiff = prevRank !== null ? (prevRank as number) - (latestRank as number) : 0; // Positive means improved (rank number got smaller)

    const columns = [
        { title: '考试名称', dataIndex: 'exam_name', key: 'exam_name' },
        { title: '日期', dataIndex: 'exam_date', key: 'exam_date' },
        { title: '总分', dataIndex: 'total_score', key: 'total_score', render: (val: number) => val.toFixed(1) },
        { title: '班级平均分', dataIndex: 'class_avg', key: 'class_avg' },
        {
            title: '班级排名',
            dataIndex: 'class_rank',
            key: 'class_rank',
            render: (rank: number, record: any) => (
                <span>
                    {rank} / {record.total_students}
                </span>
            )
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            {/* Edit Comment Modal */}
            <Modal
                title="编辑评语"
                open={editingCommentId !== null}
                onOk={handleSaveEdit}
                onCancel={() => setEditingCommentId(null)}
                okText="保存"
                cancelText="取消"
            >
                <Input.TextArea
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.target.value)}
                    rows={6}
                    placeholder="请输入评语内容"
                />
            </Modal>

            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
                <Title level={2} style={{ margin: 0 }}>学生全息档案</Title>
            </div>

            <Row gutter={[24, 24]}>
                {/* Basic Info Card */}
                <Col xs={24} md={8}>
                    <Card title="基本信息" bordered={false} style={{ height: '100%' }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ width: 80, height: 80, background: '#f0f2f5', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                                {data.student.name[0]}
                            </div>
                            <Title level={3}>{data.student.name}</Title>
                            <Text type="secondary">{data.student.class_name} | {data.student.student_id}</Text>
                        </div>
                        <Row gutter={16} style={{ textAlign: 'center', marginBottom: 16 }}>
                            <Col span={12}>
                                <Statistic
                                    title="最新排名"
                                    value={latestRank}
                                    suffix={rankDiff !== 0 && (
                                        <span style={{ color: rankDiff > 0 ? '#3f8600' : '#cf1322', fontSize: 14 }}>
                                            {rankDiff > 0 ? <RiseOutlined /> : <FallOutlined />} {Math.abs(rankDiff)}
                                        </span>
                                    )}
                                />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="百分位"
                                    value={data.statistics?.percentile.toFixed(1) || '0'}
                                    suffix="%"
                                    valueStyle={{ color: '#1890ff' }}
                                />
                            </Col>
                        </Row>

                        {data.statistics && data.statistics.percentile > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>超过班级 {data.statistics.percentile.toFixed(0)}% 的同学</Text>
                                <Progress
                                    percent={data.statistics.percentile}
                                    strokeColor={{
                                        '0%': '#108ee9',
                                        '100%': '#87d068',
                                    }}
                                    showInfo={false}
                                    style={{ marginTop: 4 }}
                                />
                            </div>
                        )}

                        {data.advantage_subjects && data.advantage_subjects.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <Text strong><TrophyOutlined style={{ color: '#52c41a' }} /> 优势学科:</Text>
                                <div style={{ marginTop: 8 }}>
                                    {data.advantage_subjects.map(as => (
                                        <Tag color="success" key={as.subject} style={{ marginBottom: 8 }}>
                                            {as.subject} (+{as.advantage.toFixed(1)}分)
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        )}

                        {data.weak_subjects.length > 0 && (
                            <div>
                                <Text strong><WarningOutlined style={{ color: '#faad14' }} /> 需关注学科:</Text>
                                <div style={{ marginTop: 8 }}>
                                    {data.weak_subjects.map(ws => (
                                        <Tag color="warning" key={ws.subject} style={{ marginBottom: 8 }}>
                                            {ws.subject} ({ws.reason})
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </Col>

                {/* Charts */}
                <Col xs={24} md={16}>
                    <Row gutter={[24, 24]}>
                        <Col span={24}>
                            <Card title="成绩与排名双轴趋势" bordered={false}>
                                <div style={{ width: '100%', height: 300, minHeight: 300 }}>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <ComposedChart data={data.history}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="exam_name" angle={-15} textAnchor="end" height={60} />
                                            <YAxis yAxisId="left" label={{ value: '总分', angle: -90, position: 'insideLeft' }} />
                                            <YAxis yAxisId="right" orientation="right" reversed label={{ value: '排名', angle: 90, position: 'insideRight' }} allowDecimals={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Line yAxisId="left" type="monotone" dataKey="total_score" stroke="#8884d8" name="总分" strokeWidth={2} dot={{ r: 4 }} />
                                            <Line yAxisId="right" type="monotone" dataKey="class_rank" stroke="#82ca9d" name="班级排名" strokeWidth={2} dot={{ r: 4 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                        <Col span={24}>
                            <Card title="学科能力雷达 (Z-Score)" bordered={false}>
                                <div style={{ width: '100%', height: 300, minHeight: 300 }}>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.radar}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="subject" />
                                            <PolarRadiusAxis angle={30} domain={[-3, 3]} />
                                            <Radar name="个人表现" dataKey="zScore" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                            <Tooltip />
                                            <Legend />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>

            {/* History Table */}
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col span={24}>
                    <Card title="历史考试记录" bordered={false}>
                        <Table
                            dataSource={data.history}
                            columns={columns}
                            rowKey="exam_id"
                            pagination={false}
                            size="middle"
                            expandable={{
                                expandedRowRender: (record) => (
                                    <div style={{ margin: 0 }}>
                                        <Table
                                            dataSource={record.subjects}
                                            columns={[
                                                { title: '学科', dataIndex: 'subject', key: 'subject' },
                                                { title: '我的分数', dataIndex: 'score', key: 'score' },
                                                { title: '班级排名', dataIndex: 'class_rank', key: 'class_rank' },
                                                { title: '班级平均分', dataIndex: 'class_avg', key: 'class_avg' },
                                                {
                                                    title: '对比',
                                                    key: 'diff',
                                                    render: (_, sub) => {
                                                        const diff = sub.score - sub.class_avg;
                                                        return (
                                                            <span style={{ color: diff >= 0 ? '#3f8600' : '#cf1322' }}>
                                                                {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                                                            </span>
                                                        );
                                                    }
                                                },
                                            ]}
                                            pagination={false}
                                            size="small"
                                            rowKey="subject"
                                        />
                                    </div>
                                ),
                                rowExpandable: (record) => !!(record.subjects && record.subjects.length > 0),
                            }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* AI Comment and History */}
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={12}>
                    <Card
                        title={<span><RobotOutlined style={{ color: '#1890ff', marginRight: 8 }} />AI 智能评语</span>}
                        bordered={false}
                        extra={
                            <Button
                                type="primary"
                                size="small"
                                icon={aiComment ? <ReloadOutlined /> : <RobotOutlined />}
                                onClick={handleGenerateComment}
                                loading={generatingComment}
                            >
                                {aiComment ? '重新生成' : '一键生成'}
                            </Button>
                        }
                    >
                        {aiComment ? (
                            <>
                                <div style={{ background: '#f6ffed', padding: 16, borderRadius: 8, border: '1px solid #b7eb8f', marginBottom: 8 }}>
                                    <Paragraph style={{ marginBottom: 0, fontSize: 15, lineHeight: 1.8 }}>
                                        {aiComment}
                                    </Paragraph>
                                </div>
                                {commentSource && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        <ClockCircleOutlined /> 来源：{commentSource}
                                    </Text>
                                )}
                            </>
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="点击上方按钮生成个性化评语"
                            />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card
                        title="评语历史记录"
                        bordered={false}
                        loading={loadingHistory}
                    >
                        {commentHistory.length > 0 ? (
                            <List
                                dataSource={commentHistory}
                                renderItem={(item: any) => (
                                    <List.Item
                                        key={item.id}
                                        actions={[
                                            <Button
                                                key="edit"
                                                size="small"
                                                icon={<EditOutlined />}
                                                onClick={() => handleEditComment(item.id, item.comment)}
                                            >
                                                编辑
                                            </Button>,
                                            <Popconfirm
                                                key="delete"
                                                title="确定删除此评语？"
                                                onConfirm={() => handleDeleteComment(item.id)}
                                            >
                                                <Button size="small" danger icon={<DeleteOutlined />}>
                                                    删除
                                                </Button>
                                            </Popconfirm>
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={
                                                <span>
                                                    {new Date(item.created_at).toLocaleString('zh-CN')}
                                                    {item.edited === 1 && (
                                                        <Tag color="orange" style={{ marginLeft: 8 }}>已编辑</Tag>
                                                    )}
                                                </span>
                                            }
                                            description={item.comment}
                                        />
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Empty description="暂无历史评语" />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
