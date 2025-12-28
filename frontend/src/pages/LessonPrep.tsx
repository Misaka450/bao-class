import { useState } from 'react';
import { Card, Select, Button, Spin, Typography, message, Empty, Space, Input } from 'antd';
import { RobotOutlined, SaveOutlined, BookOutlined, EditOutlined, SyncOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { lessonPrepApi, classApi } from '../services/api';
import { API_BASE_URL } from '../config';

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
    const [subject, setSubject] = useState<string>('chinese');
    const [grade, setGrade] = useState<number>(3);
    const [volume, setVolume] = useState<number>(1);
    const [topic, setTopic] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<number | null>(null);
    const [generatedContent, setGeneratedContent] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [feedbackInput, setFeedbackInput] = useState<string>('');
    const [isRefining, setIsRefining] = useState(false);

    const { data: classes } = useQuery({
        queryKey: ['classes'],
        queryFn: () => classApi.list()
    });

    const handleGenerate = async () => {
        if (!topic.trim()) {
            message.warning('请输入教学内容/主题');
            return;
        }

        setIsGenerating(true);
        setGeneratedContent('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/lesson-prep/generate/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subject,
                    grade,
                    volume,
                    topic,
                    classId: selectedClass
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
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') continue;
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.choices?.[0]?.delta?.content) {
                                setGeneratedContent(prev => prev + data.choices[0].delta.content);
                            }
                        } catch { /* ignore */ }
                    }
                }
            }
        } catch {
            message.error('教案生成失败，请重试');
        } finally {
            setIsGenerating(false);
            // 触发额度刷新事件
            window.dispatchEvent(new CustomEvent('ai-usage-update'));
        }
    };

    // 根据反馈调整教案
    const handleRefine = async () => {
        if (!feedbackInput.trim()) {
            message.warning('请输入修改意见');
            return;
        }

        setIsRefining(true);
        const previousContent = generatedContent;
        setGeneratedContent('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/lesson-prep/refine/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    originalContent: previousContent,
                    feedback: feedbackInput,
                    subject,
                    grade,
                    volume,
                    topic
                })
            });

            if (!response.ok) throw new Error('调整失败');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') continue;
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.choices?.[0]?.delta?.content) {
                                setGeneratedContent(prev => prev + data.choices[0].delta.content);
                            }
                        } catch { /* ignore */ }
                    }
                }
            }

            setFeedbackInput(''); // 清空反馈输入
            message.success('教案已根据您的反馈进行调整');
        } catch {
            message.error('调整失败，请重试');
            setGeneratedContent(previousContent); // 恢复原内容
        } finally {
            setIsRefining(false);
            // 触发额度刷新事件
            window.dispatchEvent(new CustomEvent('ai-usage-update'));
        }
    };

    const saveMutation = useMutation({
        mutationFn: () => {
            const subjectName = subjectOptions.find(s => s.value === subject)?.label || subject;
            const gradeName = gradeOptions.find(g => g.value === grade)?.label || `${grade}年级`;
            const title = `${subjectName} ${gradeName} - ${topic}`;

            return lessonPrepApi.save({
                title,
                content: generatedContent,
                subject,
                grade,
                volume,
                classId: selectedClass || undefined
            });
        },
        onSuccess: () => message.success('教案保存成功'),
        onError: () => message.error('保存失败')
    });

    return (
        <div style={{ padding: 24 }}>
            <Title level={3}><RobotOutlined /> AI 智能备课</Title>
            <Paragraph type="secondary">
                输入教学内容，AI 将根据人教版教材和您选择的班级学情生成个性化教案
            </Paragraph>

            <Card title="填写教学信息" style={{ marginBottom: 24 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Space wrap size="middle">
                        <div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>科目</Text>
                            <Select
                                style={{ width: 120 }}
                                options={subjectOptions}
                                value={subject}
                                onChange={setSubject}
                            />
                        </div>
                        <div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>年级</Text>
                            <Select
                                style={{ width: 120 }}
                                options={gradeOptions}
                                value={grade}
                                onChange={setGrade}
                            />
                        </div>
                        <div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>册次</Text>
                            <Select
                                style={{ width: 100 }}
                                options={volumeOptions}
                                value={volume}
                                onChange={setVolume}
                            />
                        </div>
                        <div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                                选择班级 <Text type="secondary">(可选，结合学情)</Text>
                            </Text>
                            <Select
                                placeholder="选择班级"
                                style={{ width: 150 }}
                                options={classes?.map((c: any) => ({ value: c.id, label: c.name }))}
                                value={selectedClass}
                                onChange={setSelectedClass}
                                allowClear
                            />
                        </div>
                    </Space>

                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                            教学内容/主题 <Text type="danger">*</Text>
                        </Text>
                        <TextArea
                            placeholder="例如：两位数乘一位数、分数的初步认识、古诗《静夜思》、Unit 3 My Friends..."
                            rows={2}
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            style={{ maxWidth: 600 }}
                        />
                    </div>

                    <Button
                        type="primary"
                        icon={<RobotOutlined />}
                        onClick={handleGenerate}
                        loading={isGenerating}
                        disabled={!topic.trim()}
                        size="large"
                    >
                        {isGenerating ? 'AI 生成中...' : '生成教案'}
                    </Button>
                </Space>
            </Card>

            <Card
                title={<><BookOutlined /> 教案预览</>}
                extra={generatedContent && (
                    <Button
                        icon={<SaveOutlined />}
                        onClick={() => saveMutation.mutate()}
                        loading={saveMutation.isPending}
                        type="primary"
                    >
                        保存教案
                    </Button>
                )}
            >
                {isGenerating || isRefining ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                        <p style={{ marginTop: 16, color: '#666' }}>
                            {isRefining ? 'AI 正在根据您的反馈调整教案...' : 'AI 正在根据人教版教材生成教案...'}
                        </p>
                    </div>
                ) : generatedContent ? (
                    <>
                        <div className="markdown-content" style={{ padding: 16 }}>
                            <ReactMarkdown>{generatedContent}</ReactMarkdown>
                        </div>

                        {/* 反馈调整模块 */}
                        <div style={{
                            borderTop: '1px solid #f0f0f0',
                            padding: '16px',
                            marginTop: '16px',
                            background: '#fafafa',
                            borderRadius: '0 0 8px 8px'
                        }}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                                <EditOutlined /> 不满意？输入您的修改意见，AI 将重新调整教案
                            </Text>
                            <Space.Compact style={{ width: '100%' }}>
                                <TextArea
                                    placeholder="例如：请增加更多课堂互动环节、难度降低一些、增加分层练习..."
                                    rows={2}
                                    value={feedbackInput}
                                    onChange={e => setFeedbackInput(e.target.value)}
                                    style={{ width: 'calc(100% - 120px)' }}
                                />
                                <Button
                                    type="primary"
                                    icon={<SyncOutlined />}
                                    onClick={handleRefine}
                                    disabled={!feedbackInput.trim()}
                                    style={{ height: 'auto', minHeight: 56 }}
                                >
                                    重新调整
                                </Button>
                            </Space.Compact>
                        </div>
                    </>
                ) : (
                    <Empty description="填写教学信息后点击生成教案" />
                )}
            </Card>
        </div>
    );
}
