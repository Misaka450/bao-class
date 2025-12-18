import { designTokens } from '../config/theme';

/**
 * Theme utility functions
 * Provides helper functions for working with theme tokens
 */

/**
 * Get a design token value
 * @param tokenName - The name of the design token
 * @returns The token value
 */
export const getDesignToken = (tokenName: keyof typeof designTokens) => {
  return designTokens[tokenName];
};

/**
 * Generate CSS custom properties from design tokens
 * Useful for CSS-in-JS or inline styles
 */
export const generateCSSCustomProperties = () => {
  const cssProperties: Record<string, string> = {};
  
  Object.entries(designTokens).forEach(([key, value]) => {
    cssProperties[`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = String(value);
  });
  
  return cssProperties;
};

/**
 * Get responsive breakpoints
 * Following Ant Design Pro conventions
 */
export const breakpoints = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
} as const;

/**
 * Media query helpers
 */
export const mediaQueries = {
  xs: `@media (max-width: ${breakpoints.xs}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  xxl: `@media (min-width: ${breakpoints.xxl}px)`,
  
  // Max width queries
  maxXs: `@media (max-width: ${breakpoints.xs - 1}px)`,
  maxSm: `@media (max-width: ${breakpoints.sm - 1}px)`,
  maxMd: `@media (max-width: ${breakpoints.md - 1}px)`,
  maxLg: `@media (max-width: ${breakpoints.lg - 1}px)`,
  maxXl: `@media (max-width: ${breakpoints.xl - 1}px)`,
  maxXxl: `@media (max-width: ${breakpoints.xxl - 1}px)`,
} as const;

/**
 * Common style mixins using design tokens
 */
export const styleMixins = {
  // Card styles
  card: {
    backgroundColor: designTokens.colorBgContainer,
    borderRadius: designTokens.borderRadiusLG,
    padding: designTokens.paddingLG,
    boxShadow: designTokens.boxShadow,
    border: `1px solid ${designTokens.colorBorder}`,
  },
  
  // Button styles
  button: {
    borderRadius: designTokens.borderRadius,
    height: designTokens.controlHeight,
    padding: `0 ${designTokens.padding}px`,
    fontFamily: designTokens.fontFamily,
    fontSize: designTokens.fontSize,
    fontWeight: 500,
    boxShadow: designTokens.boxShadow,
  },
  
  // Input styles
  input: {
    borderRadius: designTokens.borderRadius,
    height: designTokens.controlHeight,
    padding: `0 ${designTokens.paddingSM}px`,
    fontFamily: designTokens.fontFamily,
    fontSize: designTokens.fontSize,
    border: `1px solid ${designTokens.colorBorder}`,
    backgroundColor: designTokens.colorBgContainer,
  },
  
  // Text styles
  text: {
    primary: {
      color: designTokens.colorText,
      fontSize: designTokens.fontSize,
      fontFamily: designTokens.fontFamily,
    },
    secondary: {
      color: designTokens.colorTextSecondary,
      fontSize: designTokens.fontSize,
      fontFamily: designTokens.fontFamily,
    },
    tertiary: {
      color: designTokens.colorTextTertiary,
      fontSize: designTokens.fontSizeSM,
      fontFamily: designTokens.fontFamily,
    },
  },
  
  // Layout styles
  layout: {
    container: {
      backgroundColor: designTokens.colorBgLayout,
      minHeight: '100vh',
    },
    content: {
      backgroundColor: designTokens.colorBgContainer,
      borderRadius: designTokens.borderRadiusLG,
      padding: designTokens.paddingLG,
      margin: designTokens.marginLG,
    },
  },
} as const;

/**
 * Get theme-aware styles for common components
 */
export const getThemeStyles = () => ({
  // Loading spinner container
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: designTokens.colorBgLayout,
  },
  
  // Page header
  pageHeader: {
    backgroundColor: designTokens.colorBgContainer,
    borderBottom: `1px solid ${designTokens.colorBorder}`,
    padding: `${designTokens.padding}px ${designTokens.paddingLG}px`,
  },
  
  // Content wrapper
  contentWrapper: {
    padding: designTokens.paddingLG,
    backgroundColor: designTokens.colorBgLayout,
    minHeight: 'calc(100vh - 64px)', // Subtract header height
  },
  
  // Error boundary
  errorBoundary: {
    padding: designTokens.paddingLG,
    textAlign: 'center' as const,
    backgroundColor: designTokens.colorBgContainer,
    borderRadius: designTokens.borderRadiusLG,
    border: `1px solid ${designTokens.colorError}`,
    color: designTokens.colorError,
  },
});

export default {
  getDesignToken,
  generateCSSCustomProperties,
  breakpoints,
  mediaQueries,
  styleMixins,
  getThemeStyles,
};