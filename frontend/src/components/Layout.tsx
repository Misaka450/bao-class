import { useState } from 'react';
import { Layout as AntLayout, Menu, Button, Dropdown, Avatar } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DashboardOutlined,
    TeamOutlined,
    UserOutlined,
    BookOutlined,
    FileTextOutlined,
    BulkOutlined,
    BrainOutlined,
    LogoutOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Header, Sider, Content } = AntLayout;

export default function Layout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, clearAuth } = useAuthStore();

    const menuItems: MenuProps['items'] = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: '仪表盘',
            onClick: () => navigate('/dashboard'),
        },
        {
            key: '/classes',
            icon: <TeamOutlined />,
            label: '班级管理',
            onClick: () => navigate('/classes'),
        },
        {
            key: '/students',
            icon: <UserOutlined />,
            label: '学生管理',
            onClick: () => navigate('/students'),
        },
        {
            key: 'teaching',
            icon: <BookOutlined />,
            label: '教学管理',
            children: [
                {
                    key: '/courses',
                    label: '课程管理',
                    onClick: () => navigate('/courses'),
                },
                {
                    key: '/exams',
                    label: '考试管理',
                    onClick: () => navigate('/exams'),
                },
                {
                    key: '/import',
                    label: '数据导入',
                    onClick: () => navigate('/import'),
                },
            ],
        },
        {
            key: '/analysis',
            icon: <BrainOutlined />,
            label: 'AI 分析',
            onClick: () => navigate('/analysis'),
        },
    ];

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: () => {
                clearAuth();
                navigate('/login');
            },
        },
    ];

    return (
        <AntLayout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
                <div
                    style={{
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 600,
                        color: '#667eea',
                    }}
                >
                    {collapsed ? '成绩' : '成绩管理系统'}
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    style={{ borderRight: 0 }}
                />
            </Sider>
            <AntLayout>
                <Header
                    style={{
                        padding: '0 24px',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #f0f0f0',
                    }}
                >
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: 16, width: 64, height: 64 }}
                    />
                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
                            <span>{user?.name || user?.username}</span>
                        </div>
                    </Dropdown>
                </Header>
                <Content
                    style={{
                        margin: '24px',
                        padding: 24,
                        background: '#fff',
                        borderRadius: 8,
                        minHeight: 280,
                    }}
                >
                    {children}
                </Content>
            </AntLayout>
        </AntLayout>
    );
}
