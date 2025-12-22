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
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);

        // 确保在一帧之后渲染图表，给父容器留出布局时间
        const timer = setTimeout(() => setIsReady(true), 50);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
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
            position: 'relative',
            overflow: 'hidden' // 防止容器溢出干扰尺寸计算
        }}>
            {isReady && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                    {children || <div />}
                </ResponsiveContainer>
            )}
        </div>
    );
};

export default ChartWrapper;
