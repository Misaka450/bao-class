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
                            <Card title="核心指标" className="stat-card" bodyStyle={{ height: 360, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                                <Statistic
                                    title="最高分"
                                    value={highestScore}
                                    precision={1}
                                    valueStyle={{ color: '#10b981', fontSize: '2rem', fontFamily: 'Poppins' }}
                                    prefix={<TrophyOutlined />}
                                />
                                <Statistic
                                    title={selectedCourseId ? "平均分" : "平均总分"}
                                    value={stats?.average_score}
                                    precision={1}
                                    valueStyle={{ color: '#3b82f6', fontSize: '2rem', fontFamily: 'Poppins' }}
                                    prefix={<RiseOutlined />}
                                />
                                <Row gutter={[16, 16]}>
                                    <Col xs={12} sm={12}>
                                        <Statistic
                                            title="及格率"
                                            value={stats?.pass_rate}
                                            suffix="%"
                                            valueStyle={{ color: '#f59e0b', fontSize: '1.2rem', fontFamily: 'Poppins' }}
                                            prefix={<CheckCircleOutlined />}
                                        />
                                    </Col>
                                    <Col xs={12} sm={12}>
                                        <Statistic
                                            title="优秀率"
                                            value={stats?.excellent_rate}
                                            suffix="%"
                                            valueStyle={{ color: '#8b5cf6', fontSize: '1.2rem', fontFamily: 'Poppins' }}
                                            prefix={<StarOutlined />}
                                        />
                                    </Col>
                                </Row>
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