import React from 'react';
import { Button, Tooltip } from 'antd';
import { RobotOutlined, CloseOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';

interface ChatHeaderProps {
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
    onClose: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = React.memo(({
    isFullscreen,
    onToggleFullscreen,
    onClose
}) => (
    <div className="ai-chat-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #efefef',
        flexShrink: 0
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RobotOutlined />
            <span>AI 助教</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tooltip title={isFullscreen ? '退出全屏' : '全屏显示'}>
                <Button
                    type="text"
                    icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                    onClick={onToggleFullscreen}
                    size="small"
                />
            </Tooltip>
            <Tooltip title="关闭">
                <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={onClose}
                    size="small"
                />
            </Tooltip>
        </div>
    </div>
));

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;
