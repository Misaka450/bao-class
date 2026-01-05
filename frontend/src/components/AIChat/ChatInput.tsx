import React from 'react';
import { Input, Button, Tooltip } from 'antd';
import { SendOutlined, StopOutlined } from '@ant-design/icons';

type ChatMode = 'query' | 'knowledge';

interface ChatInputProps {
    mode: ChatMode;
    value: string;
    loading: boolean;
    onChange: (value: string) => void;
    onSend: () => void;
    onStop: () => void;
}

const ChatInput: React.FC<ChatInputProps> = React.memo(({
    mode,
    value,
    loading,
    onChange,
    onSend,
    onStop
}) => (
    <div className="ai-chat-input" style={{
        padding: 16,
        borderTop: '1px solid #efefef',
        flexShrink: 0
    }}>
        <Input
            placeholder={mode === 'query'
                ? '输入查询指令，如"三年级一班的数学成绩"...'
                : '输入教学问题，如"如何培养学生的学习兴趣"...'}
            value={value}
            onChange={e => onChange(e.target.value)}
            onPressEnter={onSend}
            suffix={
                loading ? (
                    <Tooltip title="停止生成">
                        <Button
                            type="primary"
                            danger
                            icon={<StopOutlined />}
                            onClick={onStop}
                            size="small"
                        />
                    </Tooltip>
                ) : (
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={onSend}
                        size="small"
                    />
                )
            }
        />
    </div>
));

ChatInput.displayName = 'ChatInput';

export default ChatInput;
