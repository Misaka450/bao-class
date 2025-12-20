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
import DistributionChart from '../components/DistributionChart';
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
                            <DistributionChart
                                data={distribution}
                                isCourseSelected={!!selectedCourseId}
                            />
                        </ProCard>

                        <ProCard colSpan={{ xs: 24, lg: 8 }} ghost>
                            <Card
                                title={<span style={{ fontWeight: 600, fontSize: '16px' }}>📊 核心指标概览</span>}
                                className="glass-card"
                                bordered={false}
                                style={{ height: '100%' }}
                                bodyStyle={{ padding: '20px' }}
                            >
                                {/* 指标网格 - 更加清爽的布局 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {/* 最高分 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '48px', height: '48px',
                                            borderRadius: '12px',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#10b981', fontSize: '20px'
                                        }}>
                                            <TrophyOutlined />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', color: '#6b7280' }}>最高分</div>
                                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', fontFamily: 'Poppins' }}>
                                                {typeof highestScore === 'number' ? highestScore.toFixed(1) : '--'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 平均分 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '48px', height: '48px',
                                            borderRadius: '12px',
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#3b82f6', fontSize: '20px'
                                        }}>
                                            <RiseOutlined />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedCourseId ? "平均分" : "平均总分"}</div>
                                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', fontFamily: 'Poppins' }}>
                                                {stats?.average_score != null ? Number(stats.average_score).toFixed(1) : '--'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 及格率 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '48px', height: '48px',
                                            borderRadius: '12px',
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#f59e0b', fontSize: '20px'
                                        }}>
                                            <CheckCircleOutlined />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', color: '#6b7280' }}>及格率</div>
                                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', fontFamily: 'Poppins' }}>
                                                {stats?.pass_rate != null ? Number(stats.pass_rate).toFixed(1) : '--'}
                                                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 优秀率 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '48px', height: '48px',
                                            borderRadius: '12px',
                                            background: 'rgba(139, 92, 246, 0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#8b5cf6', fontSize: '20px'
                                        }}>
                                            <StarOutlined />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', color: '#6b7280' }}>优秀率</div>
                                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', fontFamily: 'Poppins' }}>
                                                {stats?.excellent_rate != null ? Number(stats.excellent_rate).toFixed(1) : '--'}
                                                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </ProCard>
                    </ProCard>

                    {/* Student Stats Row */}
                    <ProCard ghost style={{ marginTop: 24 }} gutter={[24, 24]}>
                        {/* Top 5 Students */}
                        <ProCard colSpan={{ xs: 24, md: 8 }} title="优秀学生 (Top 5)">
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
                        <ProCard colSpan={{ xs: 24, md: 8 }} title="进步最大 (Top 5)">
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
                        <ProCard colSpan={{ xs: 24, md: 8 }} title="退步最大 (Top 5)">
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