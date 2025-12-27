import { useState, useMemo } from 'react';
import { Card, Select, Button, Spin, Typography, message, Empty, Space, Input, Cascader } from 'antd';
import { RobotOutlined, SaveOutlined, BookOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { textbookApi, lessonPrepApi, classApi } from '../services/api';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const subjectOptions = [
    { value: 'math', label: '数学' },
    { value: 'chinese', label: '语文' },
    { value: 'english', label: '英语' },
];

const gradeOptions = [
    { value: 1, label: '一年级' },
    { value: 2, label: '二年级' },
    { value: 3, label: '三年级' },
    { value: 4, label: '四年级' },
    { value: 5, label: '五年级' },
    { value: 6, label: '六年级' },
];

const volumeOptions = [
    { value: 1, label: '上册' },
    { value: 2, label: '下册' },
];

export default function LessonPrep() {
    const [subject, setSubject] = useState<string | null>(null);
    const [grade, setGrade] = useState<number | null>(null);
    const [volume, setVolume] = useState<number | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
    const [customTopic, setCustomTopic] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<number | null>(null);
    const [generatedContent, setGeneratedContent] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    const { data: catalog } = useQuery({
        queryKey: ['textbook-catalog'],
        queryFn: () => textbookApi.getCatalog()
    });

    const { data: classes } = useQuery({
        queryKey: ['classes'],
        queryFn: () => classApi.list()
    });

    // 根据筛选条件过滤章节
    const filteredBook = useMemo(() => {
        if (!catalog || !subject || !grade || !volume) return null;
        return catalog.find((b: any) =>
            b.subject === subject && b.grade === grade && b.volume === volume
        );
    }, [catalog, subject, grade, volume]);

    const unitOptions = useMemo(() => {
        if (!filteredBook) return [];
        return filteredBook.chapters?.map((ch: any) => ({
            value: ch.id,
            label: ch.unitName + (ch.lessonName ? ` - ${ch.lessonName}` : '')
        })) || [];
    }, [filteredBook]);

    const handleGenerate = async () => {
        if (!selectedUnit && !customTopic) {
            message.warning('请选择章节或输入备课主题');
            return;
        }

        setIsGenerating(true);
        setGeneratedContent('');

        try {
            const response = await fetch('/api/lesson-prep/generate/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    catalogId: selectedUnit,
                    classId: selectedClass,
                    customTopic: customTopic || undefined
                })
            });

            if (!response.ok) throw new Error('生成失败');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.choices?.[0]?.delta?.content) {
                                setGeneratedContent(prev => prev + data.choices[0].delta.content);
                            }
                        } catch { /* ignore */ }
                    }
                }
            }
        } catch {
            message.error('教案生成失败');
        } finally {
            setIsGenerating(false);
        }
    };

    const saveMutation = useMutation({
        mutationFn: () => {
            const title = customTopic || unitOptions.find((u: any) => u.value === selectedUnit)?.label || '教案';
            return lessonPrepApi.save({
                catalogId: selectedUnit || 0,
                classId: selectedClass || undefined,
                title,
                content: generatedContent
            });
        },
        onSuccess: () => message.success('教案保存成功'),
        onError: () => message.error('保存失败')
    });

    return (
        <div style={{ padding: 24 }}>
            <Title level={3}><RobotOutlined /> AI 智能备课</Title>
            <Paragraph type="secondary">选择教材章节或输入备课主题，AI 将生成个性化教案</Paragraph>

            <Card title="选择备课内容" style={{ marginBottom: 24 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {/* 级联筛选 */}
                    <Space wrap size="middle">
                        <div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>科目</Text>
                            <Select
                                placeholder="选择科目"
                                style={{ width: 120 }}
                                options={subjectOptions}
                                value={subject}
                                onChange={(v) => { setSubject(v); setGrade(null); setVolume(null); setSelectedUnit(null); }}
                            />
                        </div>
                        <div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>年级</Text>
                            <Select
                                placeholder="选择年级"
                                style={{ width: 120 }}
                                options={gradeOptions}
                                value={grade}
                                onChange={(v) => { setGrade(v); setVolume(null); setSelectedUnit(null); }}
                                disabled={!subject}
                            />
                        </div>
                        <div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>册次</Text>
                            <Select
                                placeholder="上/下册"
                                style={{ width: 100 }}
                                options={volumeOptions}
                                value={volume}
                                onChange={(v) => { setVolume(v); setSelectedUnit(null); }}
                                disabled={!grade}
                            />
                        </div>
                        <div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>章节</Text>
                            <Select
                                placeholder="选择章节"
                                style={{ width: 200 }}
                                options={unitOptions}
                                value={selectedUnit}
                                onChange={setSelectedUnit}
                                disabled={!volume || unitOptions.length === 0}
                                showSearch
                                optionFilterProp="label"
                            />
                        </div>
                    </Space>

                    {/* 自定义主题输入 */}
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                            或输入自定义备课主题 <Text type="secondary">(可选)</Text>
                        </Text>
                        <TextArea
                            placeholder="例如：三年级数学 - 两位数乘法的教学设计"
                            rows={2}
                            value={customTopic}
                            onChange={e => setCustomTopic(e.target.value)}
                            style={{ maxWidth: 500 }}
                        />
                    </div>

                    {/* 班级选择 */}
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                            选择班级 <Text type="secondary">(可选，用于结合学情)</Text>
                        </Text>
                        <Select
                            placeholder="选择班级"
                            style={{ width: 200 }}
                            options={classes?.map((c: any) => ({ value: c.id, label: c.name }))}
                            value={selectedClass}
                            onChange={setSelectedClass}
                            allowClear
                        />
                    </div>

                    <Button
                        type="primary"
                        icon={<RobotOutlined />}
                        onClick={handleGenerate}
                        loading={isGenerating}
                        disabled={!selectedUnit && !customTopic}
                        size="large"
                    >
                        {isGenerating ? '生成中...' : '生成教案'}
                    </Button>
                </Space>
            </Card>

            <Card
                title={<><BookOutlined /> 教案预览</>}
                extra={generatedContent && (
                    <Button icon={<SaveOutlined />} onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
                        保存教案
                    </Button>
                )}
            >
                {isGenerating ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                        <p style={{ marginTop: 16 }}>AI 正在生成教案...</p>
                    </div>
                ) : generatedContent ? (
                    <div className="markdown-content" style={{ padding: 16 }}>
                        <ReactMarkdown>{generatedContent}</ReactMarkdown>
                    </div>
                ) : (
                    <Empty description="选择章节或输入主题后点击生成教案" />
                )}
            </Card>
        </div>
    );
}
