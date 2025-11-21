import { theme } from 'antd';

export const lightTheme = {
    algorithm: theme.defaultAlgorithm,
    token: {
        colorPrimary: '#6366f1', // Indigo 500
        colorBgBase: '#f8fafc', // Slate 50
        colorBgContainer: '#ffffff',
        colorTextBase: '#1e293b', // Slate 800
        colorTextSecondary: '#64748b', // Slate 500
        borderRadius: 12,
        fontFamily: "'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
    components: {
        Card: {
            colorBgContainer: '#ffffff',
            boxShadowTertiary: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            paddingLG: 24,
        },
        Layout: {
            colorBgBody: '#f8fafc',
            colorBgHeader: 'rgba(255, 255, 255, 0.8)',
            colorBgTrigger: '#ffffff',
        },
        Menu: {
            itemBg: 'transparent',
            itemColor: 'rgba(255, 255, 255, 0.7)',
            itemSelectedBg: 'rgba(255, 255, 255, 0.2)',
            itemSelectedColor: '#ffffff',
            itemHoverBg: 'rgba(255, 255, 255, 0.1)',
            itemHoverColor: '#ffffff',
        },
        Table: {
            headerBg: '#f1f5f9', // Slate 100
            headerColor: '#475569', // Slate 600
            rowHoverBg: '#f8fafc',
            borderColor: '#e2e8f0', // Slate 200
        },
        Button: {
            borderRadius: 8,
            controlHeight: 40,
            boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2), 0 2px 4px -1px rgba(99, 102, 241, 0.1)',
        },
        Input: {
            controlHeight: 40,
            colorBgContainer: '#ffffff',
            colorBorder: '#e2e8f0',
            activeBorderColor: '#6366f1',
            hoverBorderColor: '#818cf8',
        },
        Select: {
            controlHeight: 40,
            colorBgContainer: '#ffffff',
            colorBorder: '#e2e8f0',
        },
        Statistic: {
            titleFontSize: 14,
            contentFontSize: 24,
        }
    },
};
