import React from 'react';
import { Spin } from 'antd';
import { SkeletonLoading, SkeletonLoadingProps } from './Loading/SkeletonLoading';

export interface LoadingProps {
  type?: 'spin' | 'skeleton';
  size?: 'small' | 'default' | 'large';
  tip?: string;
  spinning?: boolean;
  children?: React.ReactNode;
  minHeight?: number | string;
  skeletonProps?: Omit<SkeletonLoadingProps, 'loading'>;
}

/**
 * 统一的加载组件
 * 支持传统 Spin 加载和骨架屏加载
 */
export const Loading: React.FC<LoadingProps> = ({
  type = 'spin',
  size = 'large',
  tip = '加载中...',
  spinning = true,
  children,
  minHeight = '400px',
  skeletonProps = {},
}) => {
  if (type === 'skeleton') {
    return (
      <SkeletonLoading
        {...skeletonProps}
        loading={spinning}
        size={size}
      >
        {children}
      </SkeletonLoading>
    );
  }

  if (children) {
    return (
      <Spin size={size} tip={tip} spinning={spinning}>
        {children}
      </Spin>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight
    }}>
      <Spin size={size} tip={tip} />
    </div>
  );
};

// 保持向后兼容的默认导出
export default Loading;
