import { useMemo } from 'react';
import { Grid } from 'antd';
import type { ProTableProps } from '@ant-design/pro-components';

const { useBreakpoint } = Grid;

/**
 * 移动端表格适配 Hook
 * 自动根据屏幕宽度调整 ProTable 的配置
 */
export function useMobileTable<T extends Record<string, any>>() {
    const screens = useBreakpoint();
    const isMobile = !screens.md; // md (768px) 以下视为移动端

    const tableProps: Partial<ProTableProps<T, any>> = useMemo(() => {
        if (isMobile) {
            return {
                cardBordered: true,
                search: {
                    filterType: 'light',
                    defaultCollapsed: true,
                    span: 24,
                    labelWidth: 'auto',
                },
                options: {
                    density: false,
                    fullScreen: false,
                    reload: true,
                    setting: false,
                },
                pagination: {
                    size: 'small',
                    showSizeChanger: false,
                    showQuickJumper: false,
                    simple: true,
                },
                // 移动端卡片视图样式优化
                cardProps: {
                    bodyStyle: { padding: '12px 12px 0 12px' },
                },
                scroll: { x: 'max-content' },
            };
        }

        return {
            cardBordered: false,
            search: {
                defaultCollapsed: false,
            },
            options: {
                density: true,
                fullScreen: true,
                reload: true,
                setting: true,
            },
            scroll: { x: 1000 },
        };
    }, [isMobile]);

    return {
        isMobile,
        tableProps,
    };
}

export default useMobileTable;
