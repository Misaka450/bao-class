import { Spin } from 'antd';

export const Loading = () => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
    }}>
        <Spin size="large" tip="加载中..." />
    </div>
);
