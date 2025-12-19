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

  const renderTableSkeleton = () => (
    <Card bordered={false}>
      <Skeleton active={active} paragraph={{ rows: rows + 2 }} title />
    </Card>
  );

  const renderFormSkeleton = () => (
    <Card bordered={false}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Skeleton.Input active={active} block />
        <Skeleton active={active} paragraph={{ rows: 3 }} />
        <Skeleton.Button active={active} size="large" />
      </Space>
    </Card>
  );

  const renderCardSkeleton = () => (
    <Card bordered={false}>
      <Skeleton active={active} avatar title paragraph={{ rows: 3 }} />
    </Card>
  );

  const renderListSkeleton = () => (
    <div style={{ padding: '24px' }}>
      <Skeleton active={active} avatar paragraph={{ rows: rows }} />
    </div>
  );

  const renderChartSkeleton = () => (
    <Card bordered={false}>
      <div style={{ height: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton.Button active={active} size="small" style={{ width: 120 }} />
        <Skeleton.Node active={active} style={{ width: '100%', height: 200 }} />
      </div>
    </Card>
  );

  const renderProfileSkeleton = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card bordered={false}>
        <Skeleton active={active} avatar={{ size: 'large', shape: 'circle' }} title paragraph={{ rows: 1 }} />
      </Card>
      <Row gutter={24}>
        <Col span={12}><renderChartSkeleton /></Col>
        <Col span={12}><renderChartSkeleton /></Col>
      </Row>
      <renderTableSkeleton />
    </Space>
  );

  const renderPageSkeleton = () => (
    <div style={{ padding: '24px' }}>
      <Skeleton active={active} title={{ width: '30%' }} paragraph={{ rows: 1 }} />
      <div style={{ marginTop: 24 }}>
        <Row gutter={[24, 24]}>
          <Col span={24}><Skeleton.Input active={active} block style={{ height: 100 }} /></Col>
          <Col span={12}><renderChartSkeleton /></Col>
          <Col span={12}><renderChartSkeleton /></Col>
          <Col span={24}><renderTableSkeleton /></Col>
        </Row>
      </div>
    </div>
  );

  const renderCustomSkeleton = () => (
    <Skeleton active={active} paragraph={{ rows }} />
  );

  const skeletonMap = {
    table: renderTableSkeleton,
    form: renderFormSkeleton,
    card: renderCardSkeleton,
    list: renderListSkeleton,
    chart: renderChartSkeleton,
    profile: renderProfileSkeleton,
    page: renderPageSkeleton,
    custom: renderCustomSkeleton,
  };

  return skeletonMap[type]();
};

export default SkeletonLoading;