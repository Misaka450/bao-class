import React from 'react';
import { Row, Col, Statistic } from 'antd';
import type { StatisticProps } from 'antd';

interface StatItem extends StatisticProps {
    title?: React.ReactNode;
    value?: string | number;
    key?: string | number;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
}

interface StatisticsRowProps {
    items: StatItem[];
    gutter?: [number, number] | number;
    style?: React.CSSProperties;
}

export const StatisticsRow: React.FC<StatisticsRowProps> = ({
    items,
    gutter = [16, 16],
    style
}) => {
    // 默认根据项数平分，如果项数超过 4，则分两行（每行 12 span）
    const defaultSpan = Math.max(6, 24 / items.length);

    return (
        <Row gutter={gutter} style={{ textAlign: 'center', ...style }}>
            {items.map((item, index) => {
                const { key, xs, sm, md, lg, ...rest } = item;
                return (
                    <Col
                        key={key || index}
                        xs={xs || 24}
                        sm={sm || 12}
                        md={md || defaultSpan}
                        lg={lg || defaultSpan}
                    >
                        <Statistic {...rest} />
                    </Col>
                );
            })}
        </Row>
    );
};

export default StatisticsRow;
