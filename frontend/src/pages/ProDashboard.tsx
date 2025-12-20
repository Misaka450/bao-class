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
                                bodyStyle={{ height: 360, padding: '32px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                            >
                                {/* 指标网格 - 更加清爽的布局 */}
                                {/* 指标网格 - 充实版布局 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '16px', height: '100%' }}>
                                    {/* 最高分 */}
                                    <div style={{
                                        background: 'linear-gradient(145deg, #ffffff 0%, rgba(16, 185, 129, 0.08) 100%)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(16, 185, 129, 0.15)',
                                        padding: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)'
                                    }}>
                                        <div style={{
                                            color: '#10b981',
                                            fontSize: '24px',
                                            marginBottom: '8px',
                                            padding: '10px',
                                            background: 'rgba(255,255,255,0.8)',
                                            borderRadius: '50%',
                                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)'
                                        }}>
                                            <TrophyOutlined />
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>最高分</div>
                                        <div style={{ fontSize: '26px', fontWeight: 700, color: '#10b981', fontFamily: 'Poppins' }}>
                                            {typeof highestScore === 'number' ? highestScore.toFixed(1) : '--'}
                                        </div>
                                    </div>

                                    {/* 平均分 */}
                                    <div style={{
                                        background: 'linear-gradient(145deg, #ffffff 0%, rgba(59, 130, 246, 0.08) 100%)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(59, 130, 246, 0.15)',
                                        padding: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)'
                                    }}>
                                        <div style={{
                                            color: '#3b82f6',
                                            fontSize: '24px',
                                            marginBottom: '8px',
                                            padding: '10px',
                                            background: 'rgba(255,255,255,0.8)',
                                            borderRadius: '50%',
                                            boxShadow: '0 2px 6px rgba(59, 130, 246, 0.15)'
                                        }}>
                                            <RiseOutlined />
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{selectedCourseId ? "平均分" : "平均总分"}</div>
                                        <div style={{ fontSize: '26px', fontWeight: 700, color: '#3b82f6', fontFamily: 'Poppins' }}>
                                            {stats?.average_score != null ? Number(stats.average_score).toFixed(1) : '--'}
                                        </div>
                                    </div>

                                    {/* 及格率 */}
                                    <div style={{
                                        background: 'linear-gradient(145deg, #ffffff 0%, rgba(245, 158, 11, 0.08) 100%)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(245, 158, 11, 0.15)',
                                        padding: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.05)'
                                    }}>
                                        <div style={{
                                            color: '#f59e0b',
                                            fontSize: '24px',
                                            marginBottom: '8px',
                                            padding: '10px',
                                            background: 'rgba(255,255,255,0.8)',
                                            borderRadius: '50%',
                                            boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)'
                                        }}>
                                            <CheckCircleOutlined />
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>及格率</div>
                                        <div style={{ fontSize: '26px', fontWeight: 700, color: '#f59e0b', fontFamily: 'Poppins' }}>
                                            {stats?.pass_rate != null ? Number(stats.pass_rate).toFixed(1) : '--'}
                                            <span style={{ fontSize: '14px', fontWeight: 500, marginLeft: '2px' }}>%</span>
                                        </div>
                                    </div>

                                    {/* 优秀率 */}
                                    <div style={{
                                        background: 'linear-gradient(145deg, #ffffff 0%, rgba(139, 92, 246, 0.08) 100%)',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(139, 92, 246, 0.15)',
                                        padding: '20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.05)'
                                    }}>
                                        <div style={{
                                            color: '#8b5cf6',
                                            fontSize: '24px',
                                            marginBottom: '8px',
                                            padding: '10px',
                                            background: 'rgba(255,255,255,0.8)',
                                            borderRadius: '50%',
                                            boxShadow: '0 2px 6px rgba(139, 92, 246, 0.15)'
                                        }}>
                                            <StarOutlined />
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>优秀率</div>
                                        <div style={{ fontSize: '26px', fontWeight: 700, color: '#8b5cf6', fontFamily: 'Poppins' }}>
                                            {stats?.excellent_rate != null ? Number(stats.excellent_rate).toFixed(1) : '--'}
                                            <span style={{ fontSize: '14px', fontWeight: 500, marginLeft: '2px' }}>%</span>
                                        </div>
                                    </div>
                                </div>
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