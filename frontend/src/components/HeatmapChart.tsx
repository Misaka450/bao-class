import { Card, Tooltip, Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';

interface HeatmapData {
    students: string[];
    subjects: string[];
    matrix: number[][];
    classAvg: number[];
}

interface HeatmapChartProps {
    data: HeatmapData | null;
    loading?: boolean;
}

export default function HeatmapChart({ data, loading }: HeatmapChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoveredCell, setHoveredCell] = useState<{ student: string; subject: string; score: number } | null>(null);

    // 颜色映射函数
    const getColor = (score: number): string => {
        if (score === 0) return '#f0f0f0';      // 无数据 - 灰色
        if (score >= 90) return '#52c41a';      // 优秀 (90-100) - 绿色
        if (score >= 80) return '#1890ff';      // 良好 (80-89) - 蓝色
        if (score >= 70) return '#faad14';      // 中等 (70-79) - 橙色
        if (score >= 60) return '#fa8c16';      // 及格 (60-69) - 深橙
        return '#ff4d4f';                       // 不及格 (<60) - 红色
    };

    // 导出为图片
    const handleExport = async () => {
        if (!svgRef.current) return;

        try {
            const svg = svgRef.current;
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            canvas.width = svg.clientWidth * 2;
            canvas.height = svg.clientHeight * 2;

            img.onload = () => {
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = '成绩热力图.png';
                        a.click();
                        URL.revokeObjectURL(url);
                        message.success('导出成功！');
                    }
                });
            };

            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        } catch (error) {
            message.error('导出失败');
            console.error(error);
        }
    };

    if (!data || data.students.length === 0 || data.subjects.length === 0) {
        return (
            <Card title="成绩热力图" bordered={false}>
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    暂无数据
                </div>
            </Card>
        );
    }

    const cellSize = 40;
    const padding = { top: 80, right: 40, bottom: 40, left: 120 };
    const width = data.subjects.length * cellSize + padding.left + padding.right;
    const height = data.students.length * cellSize + padding.top + padding.bottom;

    return (
        <Card
            title="成绩热力图"
            bordered={false}
            extra={
                <Button
                    icon={<DownloadOutlined />}
                    onClick={handleExport}
                    size="small"
                >
                    导出图片
                </Button>
            }
        >
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 700 }}>
                <svg
                    ref={svgRef}
                    width={width}
                    height={height}
                    style={{ display: 'block', margin: '0 auto' }}
                >
                    {/* 标题 */}
                    <text
                        x={width / 2}
                        y={30}
                        textAnchor="middle"
                        style={{ fontSize: 16, fontWeight: 'bold', fill: '#333' }}
                    >
                        学生×科目成绩分布
                    </text>

                    {/* X轴标签（科目） */}
                    {data.subjects.map((subject, i) => (
                        <text
                            key={`subject-${i}`}
                            x={padding.left + i * cellSize + cellSize / 2}
                            y={padding.top - 10}
                            textAnchor="middle"
                            style={{ fontSize: 12, fill: '#666' }}
                            transform={`rotate(-45, ${padding.left + i * cellSize + cellSize / 2}, ${padding.top - 10})`}
                        >
                            {subject}
                        </text>
                    ))}

                    {/* Y轴标签（学生） */}
                    {data.students.map((student, i) => (
                        <text
                            key={`student-${i}`}
                            x={padding.left - 10}
                            y={padding.top + i * cellSize + cellSize / 2 + 4}
                            textAnchor="end"
                            style={{ fontSize: 11, fill: '#666' }}
                        >
                            {student}
                        </text>
                    ))}

                    {/* 热力图单元格 */}
                    {data.matrix.map((row, studentIndex) =>
                        row.map((score, subjectIndex) => (
                            <Tooltip
                                key={`cell-${studentIndex}-${subjectIndex}`}
                                title={
                                    <div>
                                        <div><strong>{data.students[studentIndex]}</strong></div>
                                        <div>{data.subjects[subjectIndex]}: {score === 0 ? '无数据' : score.toFixed(1)}</div>
                                        {score > 0 && data.classAvg[subjectIndex] > 0 && (
                                            <div>
                                                班级平均: {data.classAvg[subjectIndex].toFixed(1)}
                                                ({score >= data.classAvg[subjectIndex] ? '+' : ''}
                                                {(score - data.classAvg[subjectIndex]).toFixed(1)})
                                            </div>
                                        )}
                                    </div>
                                }
                            >
                                <g>
                                    <rect
                                        x={padding.left + subjectIndex * cellSize}
                                        y={padding.top + studentIndex * cellSize}
                                        width={cellSize - 1}
                                        height={cellSize - 1}
                                        fill={getColor(score)}
                                        stroke="#fff"
                                        strokeWidth={1}
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'opacity 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.opacity = '0.8';
                                            setHoveredCell({
                                                student: data.students[studentIndex],
                                                subject: data.subjects[subjectIndex],
                                                score
                                            });
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                            setHoveredCell(null);
                                        }}
                                    />
                                    {score > 0 && (
                                        <text
                                            x={padding.left + subjectIndex * cellSize + cellSize / 2}
                                            y={padding.top + studentIndex * cellSize + cellSize / 2 + 4}
                                            textAnchor="middle"
                                            style={{
                                                fontSize: 10,
                                                fill: score >= 80 ? '#fff' : '#333',
                                                pointerEvents: 'none',
                                                fontWeight: score >= 90 ? 'bold' : 'normal'
                                            }}
                                        >
                                            {score.toFixed(0)}
                                        </text>
                                    )}
                                </g>
                            </Tooltip>
                        ))
                    )}

                    {/* 图例 */}
                    <g transform={`translate(${padding.left}, ${height - 25})`}>
                        <text x={0} y={0} style={{ fontSize: 12, fill: '#666' }}>图例：</text>
                        {[
                            { label: '优秀(≥90)', color: getColor(90), x: 50 },
                            { label: '良好(80-89)', color: getColor(85), x: 140 },
                            { label: '中等(70-79)', color: getColor(75), x: 240 },
                            { label: '及格(60-69)', color: getColor(65), x: 340 },
                            { label: '不及格(<60)', color: getColor(50), x: 440 }
                        ].map((item, i) => (
                            <g key={i} transform={`translate(${item.x}, -8)`}>
                                <rect width={15} height={15} fill={item.color} stroke="#fff" />
                                <text x={20} y={12} style={{ fontSize: 11, fill: '#666' }}>
                                    {item.label}
                                </text>
                            </g>
                        ))}
                    </g>
                </svg>
            </div>

            {/* 统计信息 */}
            {hoveredCell && (
                <div style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#f0f2f5',
                    borderRadius: 4,
                    fontSize: 13
                }}>
                    <strong>{hoveredCell.student}</strong> - {hoveredCell.subject}: {' '}
                    <span style={{ color: getColor(hoveredCell.score), fontWeight: 'bold' }}>
                        {hoveredCell.score === 0 ? '无数据' : hoveredCell.score.toFixed(1)}
                    </span>
                </div>
            )}
        </Card>
    );
}
