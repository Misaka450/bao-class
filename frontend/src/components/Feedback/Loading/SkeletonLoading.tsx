import { Card, Skeleton, Space, Row, Col } from 'antd';

export interface SkeletonLoadingProps {
  type?: 'table' | 'form' | 'card' | 'list' | 'chart' | 'profile' | 'custom' | 'page';
  rows?: number;
  active?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

/**
 * 统一的骨架屏加载组件
 * 基于 Ant Design Pro 模板的加载状态设计
 */
export const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({
  type = 'custom',
  rows = 4,
  active = true,
  loading = true,
  children,
}) => {
  if (!loading && children) {
    return <>{children}</>;
  }

  const RenderTableSkeleton = () => (
    <Card bordered={false}>
      <Skeleton active={active} paragraph={{ rows: rows + 2 }} title />
    </Card>
  );

  const RenderFormSkeleton = () => (
    <Card bordered={false}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Skeleton.Input active={active} block />
        <Skeleton active={active} paragraph={{ rows: 3 }} />
        <Skeleton.Button active={active} size="large" />
      </Space>
    </Card>
  );

  const RenderCardSkeleton = () => (
    <Card bordered={false}>
      <Skeleton active={active} avatar title paragraph={{ rows: 3 }} />
    </Card>
  );

  const RenderListSkeleton = () => (
    <div style={{ padding: '24px' }}>
      <Skeleton active={active} avatar paragraph={{ rows: rows }} />
    </div>
  );

  const RenderChartSkeleton = () => (
    <Card bordered={false}>
      <div style={{ height: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton.Button active={active} size="small" style={{ width: 120 }} />
        <Skeleton.Node active={active} style={{ width: '100%', height: 200 }} />
      </div>
    </Card>
  );

  const RenderProfileSkeleton = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card bordered={false}>
        <Skeleton active={active} avatar={{ size: 'large', shape: 'circle' }} title paragraph={{ rows: 1 }} />
      </Card>
      <Row gutter={24}>
        <Col span={12}><RenderChartSkeleton /></Col>
        <Col span={12}><RenderChartSkeleton /></Col>
      </Row>
      <RenderTableSkeleton />
    </Space>
  );

  const RenderPageSkeleton = () => (
    <div style={{ padding: '24px' }}>
      <Skeleton active={active} title={{ width: '30%' }} paragraph={{ rows: 1 }} />
      <div style={{ marginTop: 24 }}>
        <Row gutter={[24, 24]}>
          <Col span={24}><Skeleton.Input active={active} block style={{ height: 100 }} /></Col>
          <Col span={12}><RenderChartSkeleton /></Col>
          <Col span={12}><RenderChartSkeleton /></Col>
          <Col span={24}><RenderTableSkeleton /></Col>
        </Row>
      </div>
    </div>
  );

  const RenderCustomSkeleton = () => (
    <Skeleton active={active} paragraph={{ rows }} />
  );

  const skeletonMap = {
    table: RenderTableSkeleton,
    form: RenderFormSkeleton,
    card: RenderCardSkeleton,
    list: RenderListSkeleton,
    chart: RenderChartSkeleton,
    profile: RenderProfileSkeleton,
    page: RenderPageSkeleton,
    custom: RenderCustomSkeleton,
  };

  return skeletonMap[type]();
};

export default SkeletonLoading;