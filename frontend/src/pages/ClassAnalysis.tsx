import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Select, Spin, Typography, Row, Col, Space, Button, message } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ClassAiReportCard from '../components/ClassAiReportCard';
import { useClassList } from '../hooks/useClassList';
import { useExamList } from '../hooks/useExamList';
import { useClassTrend, useClassSubjectTrend, useGradeComparison } from '../hooks/useClassAnalysis';
import { PageHeader } from '../components/Layout/PageHeader';
import ScoreTrendChart from '../components/Charts/ScoreTrendChart';
import SubjectRadarChart from '../components/Charts/SubjectRadarChart';
import GradePositionModule from '../components/Charts/GradePositionModule';
import { LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import ChartWrapper from '../components/Charts/ChartWrapper';

const { Title } = Typography;

export default function ClassAnalysis() {
    const { data: classes = [] } = useClassList();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [selectedSubjectForTrend, setSelectedSubjectForTrend] = useState<string>('total');
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (classes.length > 0 && !selectedClassId) {
            setSelectedClassId(classes[0].id.toString());
        }
    }, [classes, selectedClassId]);

    const { data: trendData, isLoading: loadingTrend } = useClassTrend(selectedClassId ? Number(selectedClassId) : undefined);
    const { data: subjectData, isLoading: loadingSubject } = useClassSubjectTrend(selectedClassId ? Number(selectedClassId) : undefined);

    const { data: exams = [] } = useExamList({ classId: selectedClassId, enabled: !!selectedClassId });

    // 自动选择考试逻辑
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

    const { data: gradeData, isLoading: loadingGrade } = useGradeComparison(
        selectedClassId ? Number(selectedClassId) : undefined,
        selectedExamId ? Number(selectedExamId) : undefined
    );

    const loading = loadingTrend || loadingSubject || loadingGrade;

    // 计算衍生数据
    const { currentClassInfo, averageGradeScore, scoreDiff } = useMemo(() => {
        if (!gradeData) return { currentClassInfo: null, averageGradeScore: 0, scoreDiff: 0 };
        const currentInfo = gradeData.classes.find((c: any) => c.class_id === gradeData.current_class.class_id);
        const avgGrade = gradeData.classes.reduce((acc: number, cur: any) => acc + cur.average_score, 0) / gradeData.classes.length;
        const diff = currentInfo ? (currentInfo.average_score - avgGrade) : 0;
        return { currentClassInfo: currentInfo, averageGradeScore: avgGrade, scoreDiff: diff };
    }, [gradeData]);

    const radarData = useMemo(() => {
        if (!subjectData?.subjects?.length) return [];
        const latestExamIndex = (subjectData.subjects[0]?.trends?.length || 0) - 1;
        return subjectData.subjects.map((sub: any) => ({
            subject: sub.course_name,
            score: sub.trends[latestExamIndex]?.average_score || 0,
        }));
    }, [subjectData]);

    // 获取科目列表用于综合成绩筛选
    const subjectListForTrend = useMemo(() => {
        if (!subjectData?.subjects?.length) return [];
        return subjectData.subjects.map((sub: any) => sub.course_name);
    }, [subjectData]);

    // 根据选择的科目筛选趋势数据
    const filteredTrendData = useMemo(() => {
        if (selectedSubjectForTrend === 'total') {
            return trendData?.trends || [];
        }
        const subjectInfo = subjectData?.subjects?.find((s: any) => s.course_name === selectedSubjectForTrend);
        return subjectInfo?.trends || [];
    }, [trendData, subjectData, selectedSubjectForTrend]);

    // PDF 导出功能
    const handleExportPDF = async () => {
        if (!reportRef.current) return;

        setExporting(true);
        message.loading({ content: '正在生成 PDF 报告...', key: 'pdf-export', duration: 0 });

        try {
            const element = reportRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // 如果内容超过一页，分页处理
            const pageHeight = pdf.internal.pageSize.getHeight();
            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            const className = classes.find((c: any) => c.id.toString() === selectedClassId)?.name || '班级';
            pdf.save(`${className}-学情分析报告.pdf`);

            message.success({ content: 'PDF 导出成功!', key: 'pdf-export' });
        } catch (error) {
            console.error('PDF export error:', error);
            message.error({ content: 'PDF 导出失败，请重试', key: 'pdf-export' });
        } finally {
            setExporting(false);
        }
    };

    return (
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <PageHeader
                title="班级学情分析"
                subtitle="Class Performance Analysis"
                extra={
                    <Space>
                        <Select
                            placeholder="选择班级"
                            value={selectedClassId}
                            onChange={setSelectedClassId}
                            style={{ width: 140 }}
                            options={classes.map((c: any) => ({ label: c.name, value: c.id.toString() }))}
                        />
                        <Select
                            placeholder="选择考试"
                            value={selectedExamId}
                            onChange={setSelectedExamId}
                            style={{ width: 180 }}
                            options={exams.map((e: any) => ({ label: e.name, value: e.id.toString() }))}
                            allowClear
                        />
                        <Button
                            type="primary"
                            icon={<FilePdfOutlined />}
                            onClick={handleExportPDF}
                            loading={exporting}
                            disabled={loading || !selectedClassId}
                        >
                            导出 PDF
                        </Button>
                    </Space>
                }
            />

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Spin size="large" tip="正在分析数据..." />
                </div>
            ) : (
                <div ref={reportRef} style={{ background: '#fff', padding: 16, borderRadius: 12 }}>
                    {/* 模块一：综合成绩与排名 */}
                    <Card
                        title="📊 综合成绩与排名分析"
                        bordered={false}
                        className="glass-card"
                        style={{ marginBottom: 24 }}
                        extra={
                            <Select
                                value={selectedSubjectForTrend}
                                onChange={setSelectedSubjectForTrend}
                                style={{ width: 120 }}
                                size="small"
                            >
                                <Select.Option value="total">全科总分</Select.Option>
                                {subjectListForTrend.map((subject: string) => (
                                    <Select.Option key={subject} value={subject}>{subject}</Select.Option>
                                ))}
                            </Select>
                        }
                    >
                        <Row gutter={[24, 24]}>
                            <Col xs={24} lg={14}>
                                <ScoreTrendChart
                                    data={filteredTrendData}
                                    title={selectedSubjectForTrend === 'total' ? '班级平均分历史走势' : `${selectedSubjectForTrend}平均分走势`}
                                />
                            </Col>
                            <Col xs={24} lg={10}>
                                <GradePositionModule
                                    gradeData={gradeData}
                                    currentClassInfo={currentClassInfo}
                                    averageGradeScore={averageGradeScore}
                                    scoreDiff={scoreDiff}
                                />
                            </Col>
                        </Row>
                    </Card>

                    {/* 模块二：学科优劣势透视 */}
                    {subjectData?.subjects?.length > 0 && (
                        <Card title="🧬 学科优劣势透视" bordered={false} className="glass-card">
                            <Row gutter={[24, 24]}>
                                <Col xs={24} lg={10}>
                                    <SubjectRadarChart
                                        data={radarData}
                                        title="学科能力模型"
                                    />
                                </Col>
                                <Col xs={24} lg={14}>
                                    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 16, fontWeight: 500 }}>各学科平均分变化</span>
                                        <small style={{ color: '#94a3b8' }}>点击图例隐藏/显示学科</small>
                                    </div>
                                    <ChartWrapper height={320}>
                                        <LineChart>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="exam_name" allowDuplicatedCategory={false} axisLine={false} tickLine={false} />
                                            <YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                                            <Legend />
                                            {subjectData.subjects.map((sub: any, index: number) => (
                                                <Line
                                                    key={sub.course_name}
                                                    data={sub.trends}
                                                    type="monotone"
                                                    dataKey="average_score"
                                                    name={sub.course_name}
                                                    stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]}
                                                    strokeWidth={2}
                                                    dot={false}
                                                    activeDot={{ r: 4 }}
                                                    animationDuration={1500}
                                                />
                                            ))}
                                        </LineChart>
                                    </ChartWrapper>
                                </Col>
                            </Row>
                        </Card>
                    )}
                </div>
            )}

            <ClassAiReportCard
                classId={Number(selectedClassId)}
                examId={selectedExamId ? Number(selectedExamId) : 0}
            />
        </Space>
    );
}
