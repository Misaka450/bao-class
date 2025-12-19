import React, { useState, useEffect } from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartWrapperProps {
    height?: number;
    mobileHeight?: number;
    children: React.ReactElement;
    minHeight?: number;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
    height = 350,
    mobileHeight = 280,
    minHeight,
    children
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

    return (
        <div style={{
            height: effectiveHeight,
            minHeight: effectiveMinHeight,
            width: '100%',
            position: 'relative'
        }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                {children}
            </ResponsiveContainer>
        </div>
    );
};

export default ChartWrapper;
