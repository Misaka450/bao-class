import { render, screen } from '@testing-library/react';
import { SkeletonLoading } from './SkeletonLoading';

describe('SkeletonLoading', () => {
  it('renders children when loading is false', () => {
    render(
      <SkeletonLoading loading={false}>
        <div>Content loaded</div>
      </SkeletonLoading>
    );
    
    expect(screen.getByText('Content loaded')).toBeInTheDocument();
  });

  it('renders table skeleton when type is table', () => {
    const { container } = render(<SkeletonLoading type="table" loading={true} />);
    
    // Check that a Card component is rendered
    expect(container.querySelector('.ant-card')).toBeInTheDocument();
    // Check that a Spin component is rendered
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders form skeleton when type is form', () => {
    const { container } = render(<SkeletonLoading type="form" loading={true} />);
    
    expect(container.querySelector('.ant-card')).toBeInTheDocument();
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders chart skeleton when type is chart', () => {
    const { container } = render(<SkeletonLoading type="chart" loading={true} />);
    
    expect(container.querySelector('.ant-card')).toBeInTheDocument();
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders custom skeleton by default', () => {
    const { container } = render(<SkeletonLoading loading={true} />);
    
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders profile skeleton when type is profile', () => {
    const { container } = render(<SkeletonLoading type="profile" loading={true} />);
    
    expect(container.querySelector('.ant-card')).toBeInTheDocument();
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });
});