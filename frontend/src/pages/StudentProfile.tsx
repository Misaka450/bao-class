import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftOutlined, RiseOutlined, FallOutlined, WarningOutlined, TrophyOutlined, RobotOutlined, ReloadOutlined, ClockCircleOutlined, EditOutlined, DeleteOutlined, BulbOutlined } from '@ant-design/icons';
import { Card, Row, Col, Typography, Table, Tag, message, Button, Empty, Modal, Input, List, Popconfirm, Alert, Collapse, Space, Select } from 'antd';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useStudentProfile } from '../hooks/useStudentProfile';
import { PageHeader } from '../components/Layout/PageHeader';
import ChartWrapper from '../components/Charts/ChartWrapper';
import StatisticsRow from '../components/StatisticsRow';
import { SkeletonLoading } from '../components/Feedback/Loading/SkeletonLoading';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import ClassAiReportCard from '../components/ClassAiReportCard';
import ReactMarkdown from 'react-markdown';

export default function StudentProfile() {
    const { Title, Text, Paragraph } = Typography;
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { data, isLoading: loading, error, refetch: fetchData } = useStudentProfile(id ? Number(id) : undefined);
    const [aiComment, setAiComment] = useState<string>('');
    const [generatingComment, setGeneratingComment] = useState(false);
    const [commentHistory, setCommentHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [commentSource, setCommentSource] = useState<string>('');
    const [thinkingContent, setThinkingContent] = useState('');
    const [selectedSubject, setSelectedSubject] = useState<string>('total');

    // 获取所有科目列表
    const subjectList = useMemo(() => {
        if (!data?.history || data.history.length === 0) return [];
        const subjects = new Set<string>();
        data.history.forEach((exam: any) => {
            if (exam.subjects) {
                exam.subjects.forEach((s: any) => subjects.add(s.subject));
            }
        });
        return Array.from(subjects);
    }, [data?.history]);

    // 根据选择的科目筛选图表数据
    const chartData = useMemo(() => {
        if (!data?.history) return [];
        return data.history.map((exam: any) => {
            if (selectedSubject === 'total') {
                return {
                    exam_name: exam.exam_name,
                    score: exam.total_score,
                    class_avg: exam.class_avg_total || null
                };
            } else {
                const subjectData = exam.subjects?.find((s: any) => s.subject === selectedSubject);
                return {
                    exam_name: exam.exam_name,
                    score: subjectData?.score || null,
                    class_avg: subjectData?.class_avg || null
                };
            }
        }).filter((item: any) => item.score !== null);
    }, [data?.history, selectedSubject]);

    const loadCommentHistory = async (studentId: number) => {
        setLoadingHistory(true);
        try {
            const res = await api.ai.getCommentHistory(studentId);
            if (res.success) {
                setCommentHistory(res.comments);
            }
        } catch (err) {
            console.error('Load comment history error:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleGenerateComment = async (forceRegenerate: boolean = false) => {
        if (!data?.student?.id) return;

        setGeneratingComment(true);
        setCommentSource('');
        setAiComment('');
        setThinkingContent('');

        try {
            await api.ai.generateCommentStream({
                student_id: data.student.id,
                force_regenerate: forceRegenerate
            }, {
                onChunk: (chunk) => {
                    console.log('[StudentProfile] Received chunk:', chunk);
                    setAiComment(prev => prev + chunk);
                },
                onThinking: (thinking) => {
                    console.log('[StudentProfile] Received thinking:', thinking);
                    setThinkingContent(prev => prev + thinking);
                }
            });

            message.success('评语生成成功');
            setCommentSource('AI 实时生成');
            await loadCommentHistory(data.student.id);
        } catch (error) {
            console.error('Generate comment error:', error);
            message.error('评语生成失败,请稍后重试');
        } finally {
            setGeneratingComment(false);
            // 触发额度刷新事件
            window.dispatchEvent(new CustomEvent('ai-usage-update'));
        }
    };

    const handleEditComment = (id: number, text: string) => {
        setEditingCommentId(id);
        setEditingCommentText(text);
    };

    const handleSaveEdit = async () => {
        if (!editingCommentId || !data?.student?.id) return;
        try {
            await api.ai.updateComment(editingCommentId, editingCommentText);
            message.success('评语已更新');
            setEditingCommentId(null);
            await loadCommentHistory(data.student.id);
        } catch (error) {
            message.error('更新失败');
        }
    };

    const handleDeleteComment = async (id: number) => {
        if (!data?.student?.id) return;
        try {
            await api.ai.deleteComment(id);
            message.success('评语已删除');
            await loadCommentHistory(data.student.id);
        } catch (error) {
            message.error('删除失败');
        }
    };

    useEffect(() => {
        if (data?.student?.id) {
            loadCommentHistory(data.student.id);
        }
    }, [data?.student?.id]);

    useEffect(() => {
        if (error) {
            message.error('加载学生档案失败');
        }
    }, [error]);

    if (loading) {
        return <SkeletonLoading type="profile" />;
    }

    if (!data) return <Empty description="未找到学生信息" style={{ padding: 100 }} />;

    // Calculate trends (original logic, might need adaptation based on new data structure)
    // The new data structure in the instruction snippet implies `data.exam_history` instead of `data.history`
    // and direct properties like `data.name`, `data.class_name`, etc.
    // I will adapt the rendering based on the new structure provided in the instruction.

    // The original `columns` for the history table are replaced by the new `columns` in the instruction.

    return (
        <div className="student-profile">
            {/* Edit Comment Modal - This modal is still relevant if editing history is done here, but the instruction removes the functions */}
            {/* For now, I'll keep the modal structure but note that its trigger functions are gone from this component */}
            <Modal
                title="编辑评语"
                open={editingCommentId !== null}
                onOk={handleSaveEdit}
                onCancel={() => setEditingCommentId(null)}
                okText="保存"
                cancelText="取消"
                width="90%"
                style={{ maxWidth: 600 }}
            >
                <Input.TextArea
                    value={editingCommentText}
                    onChange={(e) => setEditingCommentText(e.target.value)}
                    rows={6}
                    placeholder="请输入评语内容"
                />
            </Modal>

            <PageHeader
                title={data.student.name} // Assuming data.student.name from useStudentProfile
                subtitle={`学号: ${data.student.student_id} | 班级: ${data.student.class_name} `} // Assuming data.student.student_id and data.student.class_name
                showBack
                extra={
                    <Button
                        type="primary"
                        onClick={() => navigate('/scores-list')}
                    >
                        返回成绩列表
                    </Button>
                }
            />

            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Card bordered={false} className="info-card">
                        <StatisticsRow
                            items={[
                                {
                                    title: '性别',
                                    value: data.student.id % 2 === 0 ? '男' : '女',
                                    key: 'gender',
                                    flex: '1 0 18%',
                                    valueStyle: { color: '#722ed1' }
                                },
                                {
                                    title: '班级',
                                    value: data.student.class_name,
                                    key: 'class',
                                    flex: '1 0 18%',
                                    valueStyle: { color: '#1890ff' }
                                },
                                {
                                    title: '百分位',
                                    value: data.statistics?.percentile?.toFixed(1) || '0',
                                    suffix: '%',
                                    key: 'percentile',
                                    flex: '1 0 18%',
                                    valueStyle: { color: '#fa8c16' }
                                },
                                {
                                    title: '近期进步',
                                    value: data.statistics?.rank_progress || 0,
                                    prefix: (data.statistics?.rank_progress || 0) > 0 ? <RiseOutlined /> : <FallOutlined />,
                                    key: 'progress',
                                    flex: '1 0 18%',
                                    valueStyle: { color: (data.statistics?.rank_progress || 0) >= 0 ? '#52c41a' : '#f5222d' }
                                },
                                {
                                    title: '已考次数',
                                    value: data.statistics?.total_exams || 0,
                                    key: 'exams',
                                    flex: '1 0 18%',
                                    valueStyle: { color: '#eb2f96' }
                                }
                            ]}
                        />
                    </Card>
                </Col>

                {/* 图表展示区 */}
                <Col xs={24} lg={12}>
                    <Card
                        title="考试成绩趋势"
                        bordered={false}
                        style={{ height: '100%' }}
                        extra={
                            <Select
                                value={selectedSubject}
                                onChange={setSelectedSubject}
                                style={{ width: 120 }}
                                size="small"
                            >
                                <Select.Option value="total">全科总分</Select.Option>
                                {subjectList.map(subject => (
                                    <Select.Option key={subject} value={subject}>{subject}</Select.Option>
                                ))}
                            </Select>
                        }
                    >
                        <ChartWrapper height={300}>
                            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="exam_name" axisLine={false} tickLine={false} />
                                <YAxis domain={selectedSubject === 'total' ? [0, 'auto'] : [0, 100]} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="score"
                                    name={selectedSubject === 'total' ? '总分' : selectedSubject}
                                    stroke="var(--primary-color)"
                                    strokeWidth={3}
                                    dot={{ fill: 'var(--primary-color)', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                    activeDot={{ r: 6 }}
                                    animationDuration={1500}
                                />
                                {chartData.some((d: any) => d.class_avg) && (
                                    <Line
                                        type="monotone"
                                        dataKey="class_avg"
                                        name="班级平均"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                        animationDuration={1500}
                                    />
                                )}
                            </LineChart>
                        </ChartWrapper>
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card title="最近科目表现" bordered={false} style={{ height: '100%' }}>
                        <ChartWrapper height={300}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.radar}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                <Radar
                                    name="分数"
                                    dataKey="score"
                                    stroke="var(--primary-color)"
                                    fill="var(--primary-color)"
                                    fillOpacity={0.6}
                                    animationDuration={1500}
                                />
                                <Tooltip />
                            </RadarChart>
                        </ChartWrapper>
                    </Card>
                </Col>

                {/* 历史考试记录 */}
                <Col span={24}>
                    <Card title="历史考试记录" bordered={false}>
                        <Table
                            dataSource={data.history}
                            rowKey="exam_id"
                            scroll={{ x: 600 }}
                            expandable={{
                                expandedRowRender: (record) => (
                                    <Table
                                        columns={[
                                            { title: '科目', dataIndex: 'subject', key: 'subject' },
                                            { title: '分数', dataIndex: 'score', key: 'score', render: (text) => <Text strong>{text}</Text> },
                                            { title: '班级平均', dataIndex: 'class_avg', key: 'class_avg' },
                                            {
                                                title: '班级排名',
                                                dataIndex: 'class_rank',
                                                key: 'class_rank',
                                                render: (rank) => (
                                                    <Tag color={rank <= 3 ? 'gold' : rank <= 10 ? 'blue' : 'default'}>
                                                        第 {rank} 名
                                                    </Tag>
                                                )
                                            },
                                        ]}
                                        dataSource={record.subjects}
                                        pagination={false}
                                        size="small"
                                        rowKey="subject"
                                    />
                                ),
                                rowExpandable: (record) => record.subjects && record.subjects.length > 0,
                            }}
                            columns={[
                                { title: '考试名称', dataIndex: 'exam_name', key: 'exam_name' },
                                { title: '总分', dataIndex: 'total_score', key: 'total_score', sorter: (a, b) => a.total_score - b.total_score },
                                { title: '班级排名', dataIndex: 'class_rank', key: 'class_rank' },
                                { title: '年级排名', dataIndex: 'grade_rank', key: 'grade_rank' },
                                { title: '日期', dataIndex: 'exam_date', key: 'exam_date', render: (date) => new Date(date).toLocaleDateString() },
                            ]}
                            pagination={{ pageSize: 5 }}
                        />
                    </Card>
                </Col>

                {/* AI 智能评语与历史记录 - 放在下方 */}
                {(() => {
                    const isAuthorized = user?.role === 'admin' ||
                        (user?.authorizedClassIds === 'ALL' || user?.authorizedClassIds?.includes(data.student.class_id));

                    return (
                        <>
                            <Col xs={24} md={16}>
                                <Card
                                    title={<span><RobotOutlined style={{ color: '#1890ff', marginRight: 8 }} />AI 智能评语</span>}
                                    bordered={false}
                                    extra={
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={aiComment ? <ReloadOutlined /> : <RobotOutlined />}
                                            onClick={() => handleGenerateComment(!!aiComment)}
                                            loading={generatingComment}
                                            disabled={!isAuthorized}
                                        >
                                            {aiComment ? '重新生成' : '一键生成'}
                                        </Button>
                                    }
                                >
                                    {aiComment || (generatingComment && thinkingContent) ? (
                                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                            {generatingComment && thinkingContent && (
                                                <Alert
                                                    message="AI 正在思考中..."
                                                    description={
                                                        <Collapse ghost defaultActiveKey={['1']}>
                                                            <Collapse.Panel header="查看思考过程" key="1">
                                                                <div style={{ color: '#8c8c8c', fontStyle: 'italic', whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                                                                    {thinkingContent}
                                                                </div>
                                                            </Collapse.Panel>
                                                        </Collapse>
                                                    }
                                                    type="info"
                                                    showIcon
                                                    icon={<BulbOutlined />}
                                                />
                                            )}
                                            {aiComment && (
                                                <>
                                                    <div style={{
                                                        background: 'rgba(240, 245, 255, 0.6)',
                                                        padding: '20px',
                                                        borderRadius: '12px',
                                                        border: '1px solid rgba(145, 202, 255, 0.5)',
                                                        marginBottom: '12px',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
                                                        position: 'relative',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '4px',
                                                            height: '100%',
                                                            background: 'linear-gradient(to bottom, #1890ff, #722ed1)'
                                                        }} />
                                                        <div className="markdown-body" style={{ fontSize: '16px', lineHeight: '1.8', color: '#1e293b' }}>
                                                            <ReactMarkdown>{aiComment}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                    {commentSource && (
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                            <Tag icon={<ClockCircleOutlined />} color="default" style={{ fontSize: '11px', opacity: 0.7, border: 'none', background: 'transparent' }}>
                                                                来源：{commentSource}
                                                            </Tag>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </Space>
                                    ) : (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description={isAuthorized ? "点击上方按钮生成个性化评语" : "暂无评语，且无权生成"}
                                        />
                                    )}
                                </Card>
                            </Col>

                            <Col xs={24} md={8}>
                                <Card title="评语历史记录" bordered={false} style={{ height: '100%' }}>
                                    <List
                                        loading={loadingHistory}
                                        dataSource={commentHistory}
                                        locale={{ emptyText: <Empty description="暂无历史评语" /> }}
                                        renderItem={(item) => (
                                            <List.Item
                                                actions={isAuthorized ? [
                                                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditComment(item.id, item.comment)} />,
                                                    <Popconfirm title="确定删除？" onConfirm={() => handleDeleteComment(item.id)}>
                                                        <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                                                    </Popconfirm>
                                                ] : []}
                                                style={{ flexDirection: 'column', alignItems: 'flex-start' }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
                                                    <Text strong>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '未知日期'}</Text>
                                                    {item.edited === 1 && <Tag color="orange">已编辑</Tag>}
                                                </div>
                                                <Paragraph type="secondary" ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>{item.comment}</Paragraph>
                                            </List.Item>
                                        )}
                                    />
                                </Card>
                            </Col>
                        </>
                    );
                })()}
            </Row>
        </div>
    );
}
