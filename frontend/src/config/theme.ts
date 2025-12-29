import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

/**
 * Theme configuration following Ant Design Pro conventions
 * This provides a unified design system across all components
 */

// Design tokens - centralized design values
export const designTokens = {
  // Primary brand colors
  colorPrimary: '#6366f1', // Indigo 500
  colorSuccess: '#10b981', // Green 500
  colorWarning: '#f59e0b', // Amber 500
  colorError: '#ef4444', // Red 500
  colorInfo: '#3b82f6', // Blue 500
  
  // Background colors
  colorBgBase: '#f8fafc', // Slate 50
  colorBgContainer: '#ffffff',
  colorBgLayout: '#f8fafc',
  colorBgElevated: '#ffffff',
  
  // Text colors
  colorTextBase: '#1e293b', // Slate 800
  colorText: '#334155', // Slate 700
  colorTextSecondary: '#64748b', // Slate 500
  colorTextTertiary: '#94a3b8', // Slate 400
  colorTextQuaternary: '#cbd5e1', // Slate 300
  
  // Border colors
  colorBorder: '#e2e8f0', // Slate 200
  colorBorderSecondary: '#f1f5f9', // Slate 100
  
  // Layout dimensions
  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 6,
  borderRadiusXS: 4,
  
  // Typography
  fontSize: 14,
  fontSizeLG: 16,
  fontSizeSM: 12,
  fontSizeXL: 20,
  fontSizeHeading1: 38,
  fontSizeHeading2: 30,
  fontSizeHeading3: 24,
  fontSizeHeading4: 20,
  fontSizeHeading5: 16,
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  
  // Spacing
  padding: 16,
  paddingLG: 24,
  paddingSM: 12,
  paddingXS: 8,
  paddingXXS: 4,
  margin: 16,
  marginLG: 24,
  marginSM: 12,
  marginXS: 8,
  marginXXS: 4,
  
  // Control heights
  controlHeight: 40,
  controlHeightLG: 48,
  controlHeightSM: 32,
  
  // Shadows
  boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  boxShadowTertiary: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
};

/**
 * Light theme configuration
 * This is the default theme for the application
 */
export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    // Colors
    colorPrimary: designTokens.colorPrimary,
    colorSuccess: designTokens.colorSuccess,
    colorWarning: designTokens.colorWarning,
    colorError: designTokens.colorError,
    colorInfo: designTokens.colorInfo,
    
    // Backgrounds
    colorBgBase: designTokens.colorBgBase,
    colorBgContainer: designTokens.colorBgContainer,
    colorBgLayout: designTokens.colorBgLayout,
    colorBgElevated: designTokens.colorBgElevated,
    
    // Text
    colorTextBase: designTokens.colorTextBase,
    colorText: designTokens.colorText,
    colorTextSecondary: designTokens.colorTextSecondary,
    colorTextTertiary: designTokens.colorTextTertiary,
    colorTextQuaternary: designTokens.colorTextQuaternary,
    
    // Borders
    colorBorder: designTokens.colorBorder,
    colorBorderSecondary: designTokens.colorBorderSecondary,
    
    // Border radius
    borderRadius: designTokens.borderRadius,
    borderRadiusLG: designTokens.borderRadiusLG,
    borderRadiusSM: designTokens.borderRadiusSM,
    borderRadiusXS: designTokens.borderRadiusXS,
    
    // Typography
    fontSize: designTokens.fontSize,
    fontSizeLG: designTokens.fontSizeLG,
    fontSizeSM: designTokens.fontSizeSM,
    fontSizeXL: designTokens.fontSizeXL,
    fontSizeHeading1: designTokens.fontSizeHeading1,
    fontSizeHeading2: designTokens.fontSizeHeading2,
    fontSizeHeading3: designTokens.fontSizeHeading3,
    fontSizeHeading4: designTokens.fontSizeHeading4,
    fontSizeHeading5: designTokens.fontSizeHeading5,
    fontFamily: designTokens.fontFamily,
    
    // Spacing
    padding: designTokens.padding,
    paddingLG: designTokens.paddingLG,
    paddingSM: designTokens.paddingSM,
    paddingXS: designTokens.paddingXS,
    paddingXXS: designTokens.paddingXXS,
    margin: designTokens.margin,
    marginLG: designTokens.marginLG,
    marginSM: designTokens.marginSM,
    marginXS: designTokens.marginXS,
    marginXXS: designTokens.marginXXS,
    
    // Control heights
    controlHeight: designTokens.controlHeight,
    controlHeightLG: designTokens.controlHeightLG,
    controlHeightSM: designTokens.controlHeightSM,
    
    // Shadows
    boxShadow: designTokens.boxShadow,
    boxShadowSecondary: designTokens.boxShadowSecondary,
    boxShadowTertiary: designTokens.boxShadowTertiary,
    
    // Other
    wireframe: false,
  },
  components: {
    // Layout components
    Layout: {
      headerBg: 'rgba(255, 255, 255, 0.95)',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#ffffff',
      bodyBg: designTokens.colorBgLayout,
      triggerBg: '#ffffff',
      triggerColor: designTokens.colorText,
    },
    
    // Menu component
    Menu: {
      itemBg: 'transparent',
      itemColor: designTokens.colorTextSecondary,
      itemSelectedBg: 'rgba(99, 102, 241, 0.1)',
      itemSelectedColor: designTokens.colorPrimary,
      itemHoverBg: 'rgba(99, 102, 241, 0.05)',
      itemHoverColor: designTokens.colorPrimary,
      itemActiveBg: 'rgba(99, 102, 241, 0.15)',
      itemHeight: 40,
      itemMarginInline: 4,
      itemBorderRadius: designTokens.borderRadius,
      iconSize: 16,
      iconMarginInlineEnd: 10,
    },
    
    // Card component
    Card: {
      colorBgContainer: designTokens.colorBgContainer,
      paddingLG: designTokens.paddingLG,
      borderRadiusLG: designTokens.borderRadiusLG,
      boxShadow: designTokens.boxShadow,
    },
    
    // Table component
    Table: {
      headerBg: designTokens.colorBgBase,
      headerColor: designTokens.colorTextSecondary,
      rowHoverBg: '#f1f5f9',
      borderColor: designTokens.colorBorder,
      headerBorderRadius: designTokens.borderRadius,
      cellPaddingBlock: 16,
      cellPaddingInline: 16,
      fontSize: designTokens.fontSize,
    },
    
    // Button component
    Button: {
      borderRadius: designTokens.borderRadius,
      controlHeight: designTokens.controlHeight,
      controlHeightLG: designTokens.controlHeightLG,
      controlHeightSM: designTokens.controlHeightSM,
      paddingContentHorizontal: 16,
      fontWeight: 500,
      boxShadow: designTokens.boxShadow,
      primaryShadow: '0 2px 4px 0 rgba(99, 102, 241, 0.2)',
    },
    
    // Input component
    Input: {
      controlHeight: designTokens.controlHeight,
      controlHeightLG: designTokens.controlHeightLG,
      controlHeightSM: designTokens.controlHeightSM,
      colorBgContainer: designTokens.colorBgContainer,
      colorBorder: designTokens.colorBorder,
      activeBorderColor: designTokens.colorPrimary,
      hoverBorderColor: '#818cf8',
      borderRadius: designTokens.borderRadius,
      paddingBlock: 8,
      paddingInline: 12,
    },
    
    // Select component
    Select: {
      controlHeight: designTokens.controlHeight,
      controlHeightLG: designTokens.controlHeightLG,
      controlHeightSM: designTokens.controlHeightSM,
      colorBgContainer: designTokens.colorBgContainer,
      colorBorder: designTokens.colorBorder,
      borderRadius: designTokens.borderRadius,
    },
    
    // Form component
    Form: {
      labelFontSize: designTokens.fontSize,
      labelColor: designTokens.colorText,
      labelHeight: 32,
      verticalLabelPadding: '0 0 8px',
      itemMarginBottom: 24,
    },
    
    // Modal component
    Modal: {
      borderRadiusLG: designTokens.borderRadiusLG,
      boxShadow: designTokens.boxShadowTertiary,
      headerBg: designTokens.colorBgContainer,
      contentBg: designTokens.colorBgContainer,
      footerBg: designTokens.colorBgContainer,
    },
    
    // Drawer component
    Drawer: {
      colorBgElevated: designTokens.colorBgContainer,
      paddingLG: designTokens.paddingLG,
    },
    
    // Statistic component
    Statistic: {
      titleFontSize: designTokens.fontSizeSM,
      contentFontSize: designTokens.fontSizeHeading3,
    },
    
    // Badge component
    Badge: {
      dotSize: 8,
      fontSize: designTokens.fontSizeSM,
    },
    
    // Tag component
    Tag: {
      borderRadiusSM: designTokens.borderRadiusSM,
      fontSize: designTokens.fontSizeSM,
    },
    
    // Alert component
    Alert: {
      borderRadiusLG: designTokens.borderRadiusLG,
      paddingContentHorizontalLG: designTokens.paddingLG,
    },
    
    // Message component
    Message: {
      contentBg: designTokens.colorBgElevated,
      borderRadiusLG: designTokens.borderRadiusLG,
    },
    
    // Notification component
    Notification: {
      width: 384,
      borderRadiusLG: designTokens.borderRadiusLG,
    },
    
    // Pagination component
    Pagination: {
      itemSize: 32,
      itemSizeSM: 24,
      borderRadius: designTokens.borderRadius,
    },
    
    // Breadcrumb component
    Breadcrumb: {
      fontSize: designTokens.fontSizeSM,
      itemColor: designTokens.colorTextSecondary,
      lastItemColor: designTokens.colorText,
      linkColor: designTokens.colorTextSecondary,
      linkHoverColor: designTokens.colorPrimary,
      separatorColor: designTokens.colorTextTertiary,
    },
    
    // Tabs component
    Tabs: {
      itemColor: designTokens.colorTextSecondary,
      itemSelectedColor: designTokens.colorPrimary,
      itemHoverColor: designTokens.colorPrimary,
      inkBarColor: designTokens.colorPrimary,
      cardBg: designTokens.colorBgContainer,
    },
    
    // Steps component
    Steps: {
      iconSize: 32,
      iconSizeSM: 24,
      dotSize: 8,
    },
    
    // Spin component
    Spin: {
      colorPrimary: designTokens.colorPrimary,
      dotSize: 20,
      dotSizeSM: 14,
      dotSizeLG: 32,
    },
    
    // Skeleton component
    Skeleton: {
      colorFill: designTokens.colorBorderSecondary,
      colorFillContent: designTokens.colorBorder,
      borderRadiusSM: designTokens.borderRadiusSM,
    },
  },
};

/**
 * Dark theme configuration (optional - for future use)
 * Can be implemented when dark mode support is needed
 */
export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: designTokens.colorPrimary,
    // Add dark theme specific tokens here
  },
  components: {
    // Add dark theme specific component styles here
  },
};

// Export default theme
export default lightTheme;
