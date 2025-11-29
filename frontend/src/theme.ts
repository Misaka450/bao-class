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
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
    components: {
        Card: {
            colorBgContainer: '#ffffff',
            paddingLG: 24,
        },
        Layout: {
            colorBgBody: '#f8fafc',
            colorBgHeader: 'rgba(255, 255, 255, 0.8)',
            colorBgTrigger: '#ffffff',
        },
        Menu: {
            itemBg: 'transparent',
            itemColor: '#64748b',
            itemSelectedBg: 'rgba(99, 102, 241, 0.1)',
            itemSelectedColor: '#6366f1',
            itemHoverBg: 'rgba(99, 102, 241, 0.05)',
            itemHoverColor: '#6366f1',
        },
        Table: {
            headerBg: '#f8fafc',
            headerColor: '#64748b',
            rowHoverBg: '#f1f5f9',
            borderColor: '#e2e8f0',
        },
        Button: {
            borderRadius: 8,
            controlHeight: 40,
            boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        },
        Input: {
            controlHeight: 40,
            colorBgContainer: '#ffffff',
            colorBorder: '#e2e8f0',
            activeBorderColor: '#6366f1',
            hoverBorderColor: '#818cf8',
            borderRadius: 8,
        },
        Select: {
            controlHeight: 40,
            colorBgContainer: '#ffffff',
            colorBorder: '#e2e8f0',
            borderRadius: 8,
        },
        Statistic: {
            titleFontSize: 14,
            contentFontSize: 24,
        }
    },
};
