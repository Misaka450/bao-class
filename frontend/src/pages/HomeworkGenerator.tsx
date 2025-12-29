import { useState } from 'react';
import { Card, Select, Button, Spin, Typography, message, Empty, Space, Input, InputNumber } from 'antd';
import { RobotOutlined, SaveOutlined, FormOutlined, EditOutlined, SyncOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
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

const difficultyOptions = [
    { value: 'basic', label: '基础题' },
    { value: 'advanced', label: '提高题' },
    { value: 'challenge', label: '拓展题' },
];

export default function HomeworkGenerator() {
    const [subject, setSubject] = useState<string>('math');
    const [grade, setGrade] = useState<number>(3);
    const [topic, setTopic] = useState<string>('');
    const [difficulty, setDifficulty] = useState<string>('basic');
    const [count, setCount] = useState<number>(5);
    const [generatedContent, setGeneratedContent] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [feedbackInput, setFeedbackInput] = useState<string>('');
    const [isRefining, setIsRefining] = useState(false);

    const handleGenerate = async () => {
        if (!topic.trim()) {
            message.warning('请输入知识点/内容');
            return;
        }

        setIsGenerating(true);
        setGeneratedContent('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/lesson-prep/homework/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subject,
                    grade,
                    topic,
                    difficulty,
                    count
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
            message.error('作业生成失败，请重试');
        } finally {
            setIsGenerating(false);
            // 触发额度刷新事件
            window.dispatchEvent(new CustomEvent('ai-usage-update'));
        }
    };

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
            const response = await fetch(`${API_BASE_URL}/api/lesson-prep/homework/refine/stream`, {
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

            setFeedbackInput('');
            message.success('作业已根据您的反馈进行调整');
        } catch {
            message.error('调整失败，请重试');
            setGeneratedContent(previousContent);
        } finally {
            setIsRefining(false);
            // 触发额度刷新事件
            window.dispatchEvent(new CustomEvent('ai-usage-update'));
        }
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const subjectName = subjectOptions.find(s => s.value === subject)?.label || subject;
            const gradeName = gradeOptions.find(g => g.value === grade)?.label || `${grade}年级`;
            const difficultyName = difficultyOptions.find(d => d.value === difficulty)?.label || '';
            const title = `${subjectName} ${gradeName} ${difficultyName} - ${topic}`;

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/lesson-prep/homework/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    content: generatedContent,
                    subject,
                    grade,
                    topic,
                    difficulty
                })
            });

            if (!response.ok) throw new Error('保存失败');
            return response.json();
        },
        onSuccess: () => message.success('作业保存成功'),
        onError: () => message.error('保存失败')
    });

    return (
        <div style={{ padding: 24 }}>
            <Title level={3}><FormOutlined /> AI 作业生成</Title>
            <Paragraph type="secondary">
                输入知识点，AI 将根据难度级别生成分层练习题（含答案和解析）
            </Paragraph>

            <Card title="设置作业参数" style={{ marginBottom: 24 }}>
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
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>难度</Text>
                            <Select
                                style={{ width: 120 }}
                                options={difficultyOptions}
                                value={difficulty}
                                onChange={setDifficulty}
                            />
                        </div>
                        <div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>题目数量</Text>
                            <InputNumber
                                min={1}
                                max={20}
                                value={count}
                                onChange={v => setCount(v || 5)}
                                style={{ width: 80 }}
                            />
                        </div>
                    </Space>

                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                            知识点/内容 <Text type="danger">*</Text>
                        </Text>
                        <TextArea
                            placeholder="例如：两位数加减法、分数的意义、形容词比较级..."
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
                        {isGenerating ? 'AI 生成中...' : '生成作业'}
                    </Button>
                </Space>
            </Card>

            <Card
                title={<><FormOutlined /> 作业预览</>}
                extra={generatedContent && (
                    <Button
                        icon={<SaveOutlined />}
                        onClick={() => saveMutation.mutate()}
                        loading={saveMutation.isPending}
                        type="primary"
                    >
                        保存作业
                    </Button>
                )}
            >
                {isGenerating || isRefining ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                        <p style={{ marginTop: 16, color: '#666' }}>
                            {isRefining ? 'AI 正在根据您的反馈调整作业...' : 'AI 正在生成作业题...'}
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
                                <EditOutlined /> 不满意？输入您的修改意见，AI 将重新调整
                            </Text>
                            <Space.Compact style={{ width: '100%' }}>
                                <TextArea
                                    placeholder="例如：增加应用题、难度再降低一些、增加计算题..."
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
                    <Empty description="设置参数后点击生成作业" />
                )}
            </Card>
        </div>
    );
}
