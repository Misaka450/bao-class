import { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Skeleton, List, Avatar, Space, Tag } from 'antd';
import {
    TrophyOutlined,
    CheckCircleOutlined,
    StarOutlined,
    RiseOutlined,
    FallOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
} from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import FilterBar from '../components/FilterBar';
import SimpleDistributionChart from '../components/Charts/SimpleDistributionChart';
import { useClasses, useExams, useDashboardData } from '../hooks/useDashboard';

export default function ProDashboard() {
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    // 1. 获取班级列表
    const { data: classes = [] } = useClasses();

    // 2. 获取考试列表
    const { data: exams = [] } = useExams(selectedClassId);

    // 3. 计算当前考试的科目列表
    const courses = useMemo(() => {
        if (!selectedExamId) return [];
        const exam = exams.find(e => e.id.toString() === selectedExamId);
        return exam?.courses?.map(c => ({ id: c.course_id, name: c.course_name })) || [];
    }, [selectedExamId, exams]);

    // 4. 获取仪表盘数据
    const {
        distribution,
        stats,
        topStudents,
        progress,
        isLoading
    } = useDashboardData(selectedClassId, selectedExamId, selectedCourseId);

    // 自动选择逻辑
    useEffect(() => {
        if (classes.length > 0 && !selectedClassId) {
            setSelectedClassId(classes[0].id.toString());
        }
    }, [classes, selectedClassId]);

    useEffect(() => {
        if (exams.length > 0) {
            const currentExamExists = exams.some(e => e.id.toString() === selectedExamId);
            if (!currentExamExists || !selectedExamId) {
                setSelectedExamId(exams[0].id.toString());
            }
        } else if (exams.length === 0 && selectedExamId) {
            setSelectedExamId('');
        }
    }, [exams, selectedExamId]);

    // 当考试改变时，重置科目选择
    useEffect(() => {
        setSelectedCourseId('');
    }, [selectedExamId]);

    // Optimize: memoize highest score calculation
    const highestScore = useMemo(() =>
        topStudents.length > 0 ? topStudents[0].average_score : 0,
        [topStudents]
    );

    return (
        <div>
            <div className="dashboard-header">
                <h2 className="dashboard-title">数据仪表盘</h2>
                <p className="dashboard-subtitle">综合数据分析与可视化</p>
            </div>

            {/* Filters */}
            <FilterBar
                classes={classes}
                exams={exams}
                courses={courses as any} // 类型兼容性处理
                selectedClassId={selectedClassId}
                selectedExamId={selectedExamId}
                selectedCourseId={selectedCourseId}
                onClassChange={setSelectedClassId}
                onExamChange={setSelectedExamId}
                onCourseChange={setSelectedCourseId}
            />

            {isLoading ? (
                <div style={{ padding: 24 }}>
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={16}><Skeleton active paragraph={{ rows: 8 }} /></Col>
                        <Col xs={24} lg={8}><Skeleton active paragraph={{ rows: 8 }} /></Col>
                    </Row>
                </div>
            ) : (
                <>
                    {/* Main Stats & Distribution */}
                    <ProCard split="vertical" gutter={[24, 24]}>
                        <ProCard colSpan={{ xs: 24, lg: 16 }} ghost>
                            <SimpleDistributionChart
                                data={distribution}
                                title={selectedCourseId ? "单科成绩分布" : "总分成绩分布"}
                            />
                        </ProCard>

                        <ProCard colSpan={{ xs: 24, lg: 8 }} ghost>
                            <Card
                                title={<span style={{ fontWeight: 600, fontSize: '16px' }}>核心指标概览</span>}
                                className="chart-card"
                                bordered={false}
                                style={{ height: '100%' }}
                                bodyStyle={{ height: 360, padding: '20px 24px' }}
                            >
                                <Row gutter={[16, 24]} style={{ height: '100%' }}>
                                    <Col span={12}>
                                        <Statistic
                                            title="最高分"
                                            value={typeof highestScore === 'number' ? highestScore.toFixed(1) : '--'}
                                            prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
                                            valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: 600 }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title={selectedCourseId ? "平均分" : "平均总分"}
                                            value={stats?.average_score != null ? Number(stats.average_score).toFixed(1) : '--'}
                                            prefix={<RiseOutlined style={{ color: '#1890ff' }} />}
                                            valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: 600 }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="及格率"
                                            value={stats?.pass_rate != null ? Number(stats.pass_rate).toFixed(1) : '--'}
                                            suffix="%"
                                            prefix={<CheckCircleOutlined style={{ color: '#faad14' }} />}
                                            valueStyle={{ color: '#faad14', fontSize: '24px', fontWeight: 600 }}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="优秀率"
                                            value={stats?.excellent_rate != null ? Number(stats.excellent_rate).toFixed(1) : '--'}
                                            suffix="%"
                                            prefix={<StarOutlined style={{ color: '#722ed1' }} />}
                                            valueStyle={{ color: '#722ed1', fontSize: '24px', fontWeight: 600 }}
                                        />
                                    </Col>
                                </Row>
                            </Card>
                        </ProCard>
                    </ProCard>

                    {/* Student Stats Row */}
                    <ProCard ghost style={{ marginTop: 24 }} gutter={[24, 24]}>
                        {/* Top 5 Students */}
                        <ProCard colSpan={{ xs: 24, md: 8 }} title="优秀学生 (Top 5)" style={{ height: '100%' }}>
                            <List
                                itemLayout="horizontal"
                                dataSource={topStudents}
                                renderItem={(item, index) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<Avatar style={{ backgroundColor: index < 3 ? '#f56a00' : '#7265e6' }}>{index + 1}</Avatar>}
                                            title={item.name}
                                        />
                                        <div style={{ fontWeight: 'bold', color: '#10b981', fontFamily: 'Poppins' }}>{item.average_score}分</div>
                                    </List.Item>
                                )}
                            />
                        </ProCard>

                        {/* Most Improved */}
                        <ProCard colSpan={{ xs: 24, md: 8 }} title="进步最大 (Top 5)" style={{ height: '100%' }}>
                            <List
                                itemLayout="horizontal"
                                dataSource={progress.improved.slice(0, 5)}
                                renderItem={(item) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<Avatar style={{ backgroundColor: '#87d068' }} icon={<RiseOutlined />} />}
                                            title={item.student_name}
                                        />
                                        <Space>
                                            <Tag icon={<ArrowUpOutlined />} color="#87d068">
                                                +{item.progress}
                                            </Tag>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </ProCard>

                        {/* Biggest Decline */}
                        <ProCard colSpan={{ xs: 24, md: 8 }} title="退步最大 (Top 5)" style={{ height: '100%' }}>
                            <List
                                itemLayout="horizontal"
                                dataSource={progress.declined.slice(0, 5)}
                                renderItem={(item) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<Avatar style={{ backgroundColor: '#ff4d4f' }} icon={<FallOutlined />} />}
                                            title={item.student_name}
                                        />
                                        <Space>
                                            <Tag icon={<ArrowDownOutlined />} color="#f50">
                                                {item.progress}
                                            </Tag>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </ProCard>
                    </ProCard>
                </>
            )}
        </div>
    );
}