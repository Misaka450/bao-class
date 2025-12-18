import React from 'react';
import { Row, Col } from 'antd';
import { useResponsive } from '../hooks/useResponsive';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  // Grid settings for different screen sizes
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  xxl?: number;
  // Gutter settings
  gutter?: number | [number, number];
}

/**
 * Responsive wrapper component
 * Provides consistent responsive behavior across the application
 */
export const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({
  children,
  className,
  style,
  xs = 24,
  sm = 24,
  md = 24,
  lg = 24,
  xl = 24,
  xxl = 24,
  gutter = 16,
}) => {
  const responsive = useResponsive();

  return (
    <Row 
      gutter={responsive.isMobile ? 8 : gutter} 
      className={className} 
      style={style}
    >
      <Col xs={xs} sm={sm} md={md} lg={lg} xl={xl} xxl={xxl}>
        {children}
      </Col>
    </Row>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  gutter?: number | [number, number];
  // Number of columns for different screen sizes
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  };
}

/**
 * Responsive grid component
 * Automatically adjusts grid layout based on screen size
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  style,
  gutter = 16,
  columns = {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 4,
    xxl: 6,
  },
}) => {
  const responsive = useResponsive();

  // Determine current column count based on screen size
  let currentColumns = columns.lg || 4;
  if (responsive.xs) currentColumns = columns.xs || 1;
  else if (responsive.sm) currentColumns = columns.sm || 2;
  else if (responsive.md) currentColumns = columns.md || 3;
  else if (responsive.lg) currentColumns = columns.lg || 4;
  else if (responsive.xl) currentColumns = columns.xl || 4;
  else if (responsive.xxl) currentColumns = columns.xxl || 6;

  const colSpan = 24 / currentColumns;

  return (
    <Row 
      gutter={responsive.isMobile ? 8 : gutter} 
      className={className} 
      style={style}
    >
      {React.Children.map(children, (child, index) => (
        <Col 
          key={index}
          xs={24}
          sm={columns.sm ? 24 / columns.sm : 12}
          md={columns.md ? 24 / columns.md : 8}
          lg={columns.lg ? 24 / columns.lg : 6}
          xl={columns.xl ? 24 / columns.xl : 6}
          xxl={columns.xxl ? 24 / columns.xxl : 4}
        >
          {child}
        </Col>
      ))}
    </Row>
  );
};

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  maxWidth?: number;
  padding?: boolean;
}

/**
 * Responsive container component
 * Provides consistent container behavior with responsive padding
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  style,
  maxWidth = 1200,
  padding = true,
}) => {
  const responsive = useResponsive();

  const containerStyle: React.CSSProperties = {
    maxWidth: responsive.isMobile ? '100%' : maxWidth,
    margin: '0 auto',
    padding: padding ? (responsive.isMobile ? '16px' : '24px') : 0,
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {children}
    </div>
  );
};

export default ResponsiveWrapper;