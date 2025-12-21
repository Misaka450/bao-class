import React from 'react';
import { Typography, Button, Space } from 'antd';
import type { TypographyProps } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    extra?: React.ReactNode;
    icon?: React.ReactNode;
    showBack?: boolean;
    onBack?: () => void;
    style?: React.CSSProperties;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    extra,
    icon,
    showBack = false,
    onBack,
    style
}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="page-header" style={{ marginBottom: 24, ...style }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '16px',
                width: '100%'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 300px' }}>
                    {showBack && (
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={handleBack}
                            style={{ marginTop: '4px' }}
                        />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {icon && <span style={{ fontSize: '24px', display: 'flex' }}>{icon}</span>}
                            <Title level={2} style={{ margin: 0, fontWeight: 600, fontSize: 'calc(1.2rem + 0.5vw)' }}>
                                {title}
                            </Title>
                        </div>
                        {subtitle && (
                            <Text type="secondary" style={{ marginTop: 4, display: 'block', fontSize: '13px' }}>
                                {subtitle}
                            </Text>
                        )}
                    </div>
                </div>
                {extra && (
                    <div className="page-header-extra" style={{ flex: '1 0 auto', display: 'flex', justifyContent: 'flex-end' }}>
                        <Space wrap>{extra}</Space>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PageHeader;
