import { useState, useEffect } from 'react';
import { breakpoints } from '../utils/theme';

/**
 * Responsive design hook
 * Provides utilities for responsive behavior following Ant Design Pro conventions
 */

export interface ResponsiveInfo {
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  xxl: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Hook to get current responsive breakpoint information
 */
export const useResponsive = (): ResponsiveInfo => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    try {
      const handleResize = () => {
        try {
          setScreenSize({
            width: window.innerWidth,
            height: window.innerHeight,
          });
        } catch (error) {
          console.error('Resize handler error:', error);
        }
      };

      // Add event listener
      window.addEventListener('resize', handleResize);

      // Call handler right away so state gets updated with initial window size
      handleResize();

      // Remove event listener on cleanup
      return () => {
        try {
          window.removeEventListener('resize', handleResize);
        } catch (error) {
          console.error('Remove event listener error:', error);
        }
      };
    } catch (error) {
      console.error('useResponsive effect error:', error);
    }
  }, []);

  const { width, height } = screenSize;

  const responsiveInfo: ResponsiveInfo = {
    xs: width < breakpoints.sm,
    sm: width >= breakpoints.sm && width < breakpoints.md,
    md: width >= breakpoints.md && width < breakpoints.lg,
    lg: width >= breakpoints.lg && width < breakpoints.xl,
    xl: width >= breakpoints.xl && width < breakpoints.xxl,
    xxl: width >= breakpoints.xxl,
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
    screenWidth: width,
    screenHeight: height,
  };

  return responsiveInfo;
};

/**
 * Hook to get responsive layout settings for ProLayout
 */
export const useResponsiveLayout = () => {
  const responsive = useResponsive();

  return {
    // Layout type based on screen size
    layout: responsive.isMobile ? 'top' : 'mix',
    
    // Sidebar settings
    siderWidth: responsive.isMobile ? 0 : responsive.isTablet ? 200 : 256,
    collapsedWidth: responsive.isMobile ? 0 : 48,
    
    // Header settings
    headerHeight: responsive.isMobile ? 56 : 64,
    
    // Content settings
    contentWidth: 'Fluid' as const,
    
    // Mobile-specific settings
    isMobile: responsive.isMobile,
    
    // Breakpoint for automatic collapse
    breakpoint: responsive.isMobile ? 'xs' : 'lg',
    
    // Fixed elements
    fixedHeader: true,
    fixSiderbar: !responsive.isMobile,
    
    // Menu settings
    splitMenus: false,
    
    // Responsive info
    responsive,
  };
};

/**
 * Hook for responsive table settings
 */
export const useResponsiveTable = () => {
  const responsive = useResponsive();

  return {
    // Table size
    size: responsive.isMobile ? 'small' : 'middle',
    
    // Scroll settings
    scroll: responsive.isMobile ? { x: 800 } : undefined,
    
    // Pagination settings
    pagination: {
      size: responsive.isMobile ? 'small' : 'default',
      showSizeChanger: !responsive.isMobile,
      showQuickJumper: !responsive.isMobile,
      showTotal: (total: number, range: [number, number]) => 
        responsive.isMobile 
          ? `${range[0]}-${range[1]} / ${total}`
          : `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
      pageSize: responsive.isMobile ? 10 : 20,
    },
    
    // Column settings
    columnSettings: {
      hideOnMobile: (key: string) => responsive.isMobile && ['actions', 'description', 'extra'].includes(key),
    },
  };
};

/**
 * Hook for responsive form settings
 */
export const useResponsiveForm = () => {
  const responsive = useResponsive();

  return {
    // Form layout
    layout: responsive.isMobile ? 'vertical' : 'horizontal',
    
    // Label settings
    labelCol: responsive.isMobile ? undefined : { span: 6 },
    wrapperCol: responsive.isMobile ? undefined : { span: 18 },
    
    // Form size
    size: responsive.isMobile ? 'large' : 'middle',
    
    // Grid settings for form items
    grid: responsive.isMobile ? { gutter: 16, column: 1 } : { gutter: 24, column: 2 },
    
    // Modal settings
    modalWidth: responsive.isMobile ? '90%' : responsive.isTablet ? 600 : 800,
  };
};

/**
 * Hook for responsive card settings
 */
export const useResponsiveCard = () => {
  const responsive = useResponsive();

  return {
    // Card size
    size: responsive.isMobile ? 'small' : 'default',
    
    // Body style
    bodyStyle: {
      padding: responsive.isMobile ? 16 : 24,
    },
    
    // Head style
    headStyle: {
      padding: responsive.isMobile ? '12px 16px' : '16px 24px',
    },
    
    // Grid settings for card grids
    grid: {
      gutter: responsive.isMobile ? 8 : 16,
      xs: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 4,
      xxl: 6,
    },
  };
};

export default useResponsive;