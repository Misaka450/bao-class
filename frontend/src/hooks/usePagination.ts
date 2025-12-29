import { useState, useCallback, useMemo } from 'react';

/**
 * 分页状态接口
 */
export interface PaginationState {
    /** 当前页码（从1开始） */
    current: number;
    /** 每页条数 */
    pageSize: number;
    /** 总记录数 */
    total: number;
}

/**
 * 分页配置选项
 */
export interface UsePaginationOptions {
    /** 默认每页条数 */
    defaultPageSize?: number;
    /** 默认起始页 */
    defaultCurrent?: number;
}

/**
 * 分页 Hook 返回值
 */
export interface UsePaginationResult {
    /** 当前分页状态 */
    pagination: PaginationState;
    /** 切换页码/每页条数 */
    onChange: (page: number, pageSize?: number) => void;
    /** 设置总数 */
    setTotal: (total: number) => void;
    /** 重置分页状态 */
    reset: () => void;
    /** 分页参数（用于 API 请求） */
    params: { page: number; pageSize: number };
    /** Ant Design Table 分页配置 */
    tableProps: {
        current: number;
        pageSize: number;
        total: number;
        onChange: (page: number, pageSize: number) => void;
        showSizeChanger: boolean;
        showQuickJumper: boolean;
        showTotal: (total: number, range: [number, number]) => string;
    };
}

/**
 * 分页 Hook
 * 用于管理表格等组件的分页状态
 * 
 * @param options - 配置选项
 * @returns 分页状态和操作方法
 * 
 * @example
 * const { pagination, onChange, setTotal, tableProps } = usePagination({ defaultPageSize: 10 });
 * 
 * // 在 Table 组件中使用
 * <Table pagination={tableProps} />
 * 
 * // 在 API 请求中使用
 * useEffect(() => {
 *   fetchData({ page: pagination.current, pageSize: pagination.pageSize });
 * }, [pagination.current, pagination.pageSize]);
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
    const { defaultPageSize = 20, defaultCurrent = 1 } = options;

    const [pagination, setPagination] = useState<PaginationState>({
        current: defaultCurrent,
        pageSize: defaultPageSize,
        total: 0
    });

    const onChange = useCallback((page: number, pageSize?: number) => {
        setPagination(prev => ({
            ...prev,
            current: page,
            pageSize: pageSize ?? prev.pageSize
        }));
    }, []);

    const setTotal = useCallback((total: number) => {
        setPagination(prev => ({ ...prev, total }));
    }, []);

    const reset = useCallback(() => {
        setPagination({
            current: defaultCurrent,
            pageSize: defaultPageSize,
            total: 0
        });
    }, [defaultCurrent, defaultPageSize]);

    const params = useMemo(() => ({
        page: pagination.current,
        pageSize: pagination.pageSize
    }), [pagination.current, pagination.pageSize]);

    const tableProps = useMemo(() => ({
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total: number, range: [number, number]) =>
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
    }), [pagination, onChange]);

    return {
        pagination,
        onChange,
        setTotal,
        reset,
        params,
        tableProps
    };
}

export default usePagination;
