import { useState } from 'react';
import { Card, Select, Button, Spin, Typography, message, Empty, Space } from 'antd';
import { RobotOutlined, SaveOutlined, BookOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { textbookApi, lessonPrepApi, classApi } from '../services/api';

const { Title, Paragraph } = Typography;

export default function LessonPrep() {
    const [selectedCatalog, setSelectedCatalog] = useState<number | null>(null);
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

    const catalogOptions = catalog?.flatMap((book: any) =>
        book.chapters?.map((ch: any) => ({
            value: ch.id,
            label: `${book.subject === 'math' ? '数学' : book.subject === 'chinese' ? '语文' : '英语'} ${book.grade}年级${book.volume === 1 ? '上' : '下'}册 - ${ch.unitName}`
        })) || []
    ) || [];

    const handleGenerate = async () => {
        if (!selectedCatalog) {
            message.warning('请先选择教材章节');
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
                body: JSON.stringify({ catalogId: selectedCatalog, classId: selectedClass })
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
            const catalogInfo = catalogOptions.find((c: any) => c.value === selectedCatalog);
            return lessonPrepApi.save({
                catalogId: selectedCatalog!,
                classId: selectedClass || undefined,
                title: catalogInfo?.label || '教案',
                content: generatedContent
            });
        },
        onSuccess: () => message.success('教案保存成功'),
        onError: () => message.error('保存失败')
    });

    return (
        <div style={{ padding: 24 }}>
            <Title level={3}><RobotOutlined /> AI 智能备课</Title>
            <Paragraph type="secondary">选择教材章节和班级，AI 将根据教材内容和班级学情生成个性化教案</Paragraph>

            <Card style={{ marginBottom: 24 }}>
                <Space wrap size="large">
                    <div>
                        <div style={{ marginBottom: 8 }}>选择章节</div>
                        <Select placeholder="选择教材章节" style={{ width: 350 }} options={catalogOptions} value={selectedCatalog} onChange={setSelectedCatalog} showSearch optionFilterProp="label" />
                    </div>
                    <div>
                        <div style={{ marginBottom: 8 }}>选择班级（可选）</div>
                        <Select placeholder="选择班级以融入学情" style={{ width: 200 }} options={classes?.map((c: any) => ({ value: c.id, label: c.name }))} value={selectedClass} onChange={setSelectedClass} allowClear />
                    </div>
                    <div style={{ paddingTop: 28 }}>
                        <Button type="primary" icon={<RobotOutlined />} onClick={handleGenerate} loading={isGenerating} disabled={!selectedCatalog}>
                            {isGenerating ? '生成中...' : '生成教案'}
                        </Button>
                    </div>
                </Space>
            </Card>

            <Card title={<><BookOutlined /> 教案预览</>} extra={generatedContent && <Button icon={<SaveOutlined />} onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>保存教案</Button>}>
                {isGenerating ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /><p style={{ marginTop: 16 }}>AI 正在生成教案...</p></div>
                ) : generatedContent ? (
                    <div className="markdown-content" style={{ padding: 16 }}><ReactMarkdown>{generatedContent}</ReactMarkdown></div>
                ) : (
                    <Empty description="选择章节后点击生成教案" />
                )}
            </Card>
        </div>
    );
}
