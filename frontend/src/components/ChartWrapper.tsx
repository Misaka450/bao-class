import React, { useState, useEffect } from 'react';
import { Spin, Empty } from 'antd';
import { ResponsiveContainer } from 'recharts';

interface ChartWrapperProps {
    height?: number;
    mobileHeight?: number;
    children?: React.ReactElement; // Make children optional for loading/empty states
    minHeight?: number;
    loading?: boolean;
    empty?: boolean;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
    height = 350,
    mobileHeight = 280,
    minHeight,
    children,
    loading,
    empty
}) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const effectiveHeight = isMobile ? mobileHeight : height;
    const effectiveMinHeight = minHeight || effectiveHeight;

    if (loading) {
        return (
            <div style={{
                height: effectiveHeight,
                minHeight: effectiveMinHeight,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <Spin />
            </div>
        );
    }

    if (empty) {
        return (
            <div style={{
                height: effectiveHeight,
                minHeight: effectiveMinHeight,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
            </div>
        );
    }

    return (
        <div style={{
            height: effectiveHeight,
            minHeight: effectiveMinHeight,
            width: '100%',
            position: 'relative'
        }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={1}>
                {children || <div />}
            </ResponsiveContainer>
        </div>
    );
};

export default ChartWrapper;
