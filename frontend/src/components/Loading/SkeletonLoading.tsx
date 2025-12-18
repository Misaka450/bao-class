import React from 'react';
import { Card, Spin } from 'antd';

export interface SkeletonLoadingProps {
  type?: 'table' | 'form' | 'card' | 'list' | 'chart' | 'profile' | 'custom';
  rows?: number;
  columns?: number;
  avatar?: boolean;
  title?: boolean;
  paragraph?: boolean | { rows?: number; width?: string | number | Array<string | number> };
  active?: boolean;
  size?: 'small' | 'default' | 'large';
  loading?: boolean;
  children?: React.ReactNode;
}

/**
 * 统一的骨架屏加载组件
 * 基于 Ant Design Pro 模板的加载状态设计
 */
export const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({
  type = 'custom',
  rows = 3,
  columns = 4,
  avatar = false,
  title = true,
  paragraph = true,
  active = true,
  size = 'default',
  loading = true,
  children,
}) => {
  if (!loading && children) {
    return <>{children}</>;
  }

  const renderTableSkeleton = () => (
    <Card>
      <div style={{ padding: '16px 0' }}>
        <Spin size="large" tip="加载表格数据..." />
      </div>
    </Card>
  );

  const renderFormSkeleton = () => (
    <Card>
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Spin size="large" tip="加载表单..." />
      </div>
    </Card>
  );

  const renderCardSkeleton = () => (
    <Card>
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Spin size="large" tip="加载内容..." />
      </div>
    </Card>
  );

  const renderListSkeleton = () => (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <Spin size="large" tip="加载列表..." />
    </div>
  );

  const renderChartSkeleton = () => (
    <Card>
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="加载图表..." />
      </div>
    </Card>
  );

  const renderProfileSkeleton = () => (
    <Card>
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Spin size="large" tip="加载用户信息..." />
      </div>
    </Card>
  );

  const renderCustomSkeleton = () => (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <Spin size={size} tip="加载中..." />
    </div>
  );

  const skeletonMap = {
    table: renderTableSkeleton,
    form: renderFormSkeleton,
    card: renderCardSkeleton,
    list: renderListSkeleton,
    chart: renderChartSkeleton,
    profile: renderProfileSkeleton,
    custom: renderCustomSkeleton,
  };

  return skeletonMap[type]();
};

export default SkeletonLoading;