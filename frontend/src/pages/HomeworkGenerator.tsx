import { useState, useRef, useCallback } from 'react';
import { Card, Select, Button, Typography, message, Empty, Space, Input, InputNumber, Checkbox, Divider, Collapse } from 'antd';
import { RobotOutlined, SaveOutlined, FormOutlined, EditOutlined, SyncOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
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

const difficultyOptions = [
    { value: 'basic', label: '基础题' },
    { value: 'advanced', label: '提高题' },
    { value: 'challenge', label: '拓展题' },
];

// 题型配置
interface QuestionTypeConfig {
    enabled: boolean;
    count: number;
}

interface QuestionTypes {
    choice: QuestionTypeConfig;
    blank: QuestionTypeConfig;
    shortAnswer: QuestionTypeConfig;
}

export default function HomeworkGenerator() {
    const [subject, setSubject] = useState<string>('math');
    const [grade, setGrade] = useState<number>(3);
    const [topic, setTopic] = useState<string>('');
    const [difficulty, setDifficulty] = useState<string>('basic');
    const [questionTypes, setQuestionTypes] = useState<QuestionTypes>({
        choice: { enabled: true, count: 3 },
        blank: { enabled: true, count: 2 },
        shortAnswer: { enabled: false, count: 0 }
    });
    const [generatedContent, setGeneratedContent] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [feedbackInput, setFeedbackInput] = useState<string>('');
    const [isRefining, setIsRefining] = useState(false);
    const [showAnswers, setShowAnswers] = useState(true);

    // 用于中断请求
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleTypeToggle = (type: keyof QuestionTypes, checked: boolean) => {
        setQuestionTypes(prev => ({
            ...prev,
            [type]: { ...prev[type], enabled: checked, count: checked ? (prev[type].count || 2) : 0 }
        }));
    };

    const handleCountChange = (type: keyof QuestionTypes, count: number | null) => {
        setQuestionTypes(prev => ({
            ...prev,
            [type]: { ...prev[type], count: count || 0 }
        }));
    };

    const getTotalCount = () => {
        return (questionTypes.choice.enabled ? questionTypes.choice.count : 0) +
            (questionTypes.blank.enabled ? questionTypes.blank.count : 0) +
            (questionTypes.shortAnswer.enabled ? questionTypes.shortAnswer.count : 0);
    };

    // 停止生成
    const handleStop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsGenerating(false);
            setIsRefining(false);
        }
    }, []);

    // 处理内容：分离题目和答案
    const processContentForDisplay = useCallback((content: string) => {
        if (showAnswers) return content;

        // 隐藏答案和解析部分
        return content
            .replace(/\*\*答案\*\*[：:]\s*[^\n]*/g, '**答案**：[点击显示]')
            .replace(/\*\*解析\*\*[：:]\s*[\s\S]*?(?=\n##|\n\*\*题目|$)/g, '**解析**：[点击显示]\n');
    }, [showAnswers]);

    const handleGenerate = async () => {
        if (!topic.trim()) {
            message.warning('请输入知识点/内容');
            return;
        }
        if (getTotalCount() === 0) {
            message.warning('请至少选择一种题型');
            return;
        }

        abortControllerRef.current = new AbortController();
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
                    questionTypes: {
                        choice: questionTypes.choice.enabled ? questionTypes.choice.count : undefined,
                        blank: questionTypes.blank.enabled ? questionTypes.blank.count : undefined,
                        shortAnswer: questionTypes.shortAnswer.enabled ? questionTypes.shortAnswer.count : undefined
                    }
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
                message.error('作业生成失败，请重试');
            }
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
            window.dispatchEvent(new CustomEvent('ai-usage-update'));
        }
    };

    const handleRefine = async () => {
        if (!feedbackInput.trim()) {
            message.warning('请输入修改意见');
            return;
        }

        abortControllerRef.current = new AbortController();
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
            message.success('作业已根据您的反馈进行调整');
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

    const isLoading = isGenerating || isRefining;

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
                    </Space>

                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                            知识点/内容 <Text type="danger">*</Text>
                        </Text>
                        <TextArea
                            placeholder="例如：两位数加减法、分数的初步认识、阅读理解..."
                            rows={2}
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            style={{ maxWidth: 600 }}
                        />
                    </div>

                    {/* 题型配置 */}
                    <div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>题型配置</Text>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 16,
                            padding: 16,
                            background: '#fafafa',
                            borderRadius: 8,
                            border: '1px solid #f0f0f0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Checkbox
                                    checked={questionTypes.choice.enabled}
                                    onChange={e => handleTypeToggle('choice', e.target.checked)}
                                >
                                    选择题
                                </Checkbox>
                                <InputNumber
                                    min={0}
                                    max={10}
                                    value={questionTypes.choice.count}
                                    onChange={v => handleCountChange('choice', v)}
                                    disabled={!questionTypes.choice.enabled}
                                    size="small"
                                    style={{ width: 60 }}
                                />
                                <Text type="secondary">道</Text>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Checkbox
                                    checked={questionTypes.blank.enabled}
                                    onChange={e => handleTypeToggle('blank', e.target.checked)}
                                >
                                    填空题
                                </Checkbox>
                                <InputNumber
                                    min={0}
                                    max={10}
                                    value={questionTypes.blank.count}
                                    onChange={v => handleCountChange('blank', v)}
                                    disabled={!questionTypes.blank.enabled}
                                    size="small"
                                    style={{ width: 60 }}
                                />
                                <Text type="secondary">道</Text>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Checkbox
                                    checked={questionTypes.shortAnswer.enabled}
                                    onChange={e => handleTypeToggle('shortAnswer', e.target.checked)}
                                >
                                    简答题
                                </Checkbox>
                                <InputNumber
                                    min={0}
                                    max={10}
                                    value={questionTypes.shortAnswer.count}
                                    onChange={v => handleCountChange('shortAnswer', v)}
                                    disabled={!questionTypes.shortAnswer.enabled}
                                    size="small"
                                    style={{ width: 60 }}
                                />
                                <Text type="secondary">道</Text>
                            </div>
                            <Divider type="vertical" style={{ height: 'auto' }} />
                            <Text strong>共 {getTotalCount()} 道题目</Text>
                        </div>
                    </div>

                    <Button
                        type="primary"
                        icon={<RobotOutlined />}
                        onClick={handleGenerate}
                        loading={isGenerating}
                        disabled={!topic.trim() || getTotalCount() === 0}
                        size="large"
                    >
                        {isGenerating ? 'AI 生成中...' : '生成作业'}
                    </Button>
                </Space>
            </Card>

            <Card
                title={<><FormOutlined /> 作业预览</>}
                extra={
                    <Space>
                        {generatedContent && !isLoading && (
                            <>
                                <Button
                                    icon={showAnswers ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                    onClick={() => setShowAnswers(!showAnswers)}
                                >
                                    {showAnswers ? '隐藏答案' : '显示答案'}
                                </Button>
                                <Button
                                    icon={<SaveOutlined />}
                                    onClick={() => saveMutation.mutate()}
                                    loading={saveMutation.isPending}
                                    type="primary"
                                >
                                    保存作业
                                </Button>
                            </>
                        )}
                    </Space>
                }
            >
                {generatedContent || isLoading ? (
                    <>
                        <StreamingMarkdown
                            content={processContentForDisplay(generatedContent)}
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
                        )}
                    </>
                ) : (
                    <Empty description="设置参数后点击生成作业" />
                )}
            </Card>
        </div>
    );
}
