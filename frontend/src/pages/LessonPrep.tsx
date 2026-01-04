import { useState, useRef, useCallback } from 'react';
import { Card, Select, Button, Typography, message, Empty, Space, Input } from 'antd';
import { RobotOutlined, SaveOutlined, BookOutlined, EditOutlined, SyncOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { lessonPrepApi, classApi } from '../services/api';
import { API_BASE_URL } from '../config';
import StreamingMarkdown from '../components/StreamingMarkdown';

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

    // 用于中断请求
    const abortControllerRef = useRef<AbortController | null>(null);

    const { data: classes } = useQuery({
        queryKey: ['classes'],
        queryFn: () => classApi.list()
    });

    // 停止生成
    const handleStop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsGenerating(false);
            setIsRefining(false);
        }
    }, []);

    const handleGenerate = async () => {
        if (!topic.trim()) {
            message.warning('请输入教学内容/主题');
            return;
        }

        // 创建新的 AbortController
        abortControllerRef.current = new AbortController();

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
                }),
                signal: abortControllerRef.current.signal
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
        } catch (e: any) {
            if (e.name === 'AbortError') {
                message.info('已停止生成');
            } else {
                message.error('教案生成失败，请重试');
            }
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
            window.dispatchEvent(new CustomEvent('ai-usage-update'));
        }
    };

    // 根据反馈调整教案
    const handleRefine = async () => {
        if (!feedbackInput.trim()) {
            message.warning('请输入修改意见');
            return;
        }

        // 创建新的 AbortController
        abortControllerRef.current = new AbortController();

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
                }),
                signal: abortControllerRef.current.signal
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

            setFeedbackInput('');
            message.success('教案已根据您的反馈进行调整');
        } catch (e: any) {
            if (e.name === 'AbortError') {
                message.info('已停止生成');
                setGeneratedContent(previousContent);
            } else {
                message.error('调整失败，请重试');
                setGeneratedContent(previousContent);
            }
        } finally {
            setIsRefining(false);
            abortControllerRef.current = null;
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

    const isLoading = isGenerating || isRefining;

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
                extra={generatedContent && !isLoading && (
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
                {generatedContent || isLoading ? (
                    <>
                        <StreamingMarkdown
                            content={generatedContent}
                            isStreaming={isLoading}
                            onStop={handleStop}
                            showCopy={!isLoading}
                            loading={isLoading && !generatedContent}
                            style={{ padding: 16 }}
                        />

                        {/* 反馈调整模块 */}
                        {generatedContent && !isLoading && (
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
                        )}
                    </>
                ) : (
                    <Empty description="填写教学信息后点击生成教案" />
                )}
            </Card>
        </div>
    );
}
