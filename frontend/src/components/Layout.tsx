import { useState } from 'react';
import { Layout as AntLayout, Menu, Button, Dropdown, Avatar } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DashboardOutlined,
    TeamOutlined,
    UserOutlined,
    BookOutlined,
    BulbOutlined,
    TableOutlined,
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
    const { user, logout } = useAuthStore();

    const menuItems: MenuProps['items'] = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined style={{ color: '#3b82f6', fontSize: '18px' }} />, // Blue
            label: <span style={{ fontWeight: 500 }}>仪表盘</span>,
            onClick: () => navigate('/dashboard'),
        },
        {
            key: '/classes',
            icon: <TeamOutlined style={{ color: '#10b981', fontSize: '18px' }} />, // Emerald
            label: <span style={{ fontWeight: 500 }}>班级管理</span>,
            onClick: () => navigate('/classes'),
        },
        {
            key: '/students',
            icon: <UserOutlined style={{ color: '#f59e0b', fontSize: '18px' }} />, // Amber
            label: <span style={{ fontWeight: 500 }}>学生管理</span>,
            onClick: () => navigate('/students'),
        },
        {
            key: 'teaching',
            icon: <BookOutlined style={{ color: '#8b5cf6', fontSize: '18px' }} />, // Violet
            label: <span style={{ fontWeight: 500 }}>教学管理</span>,
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
            key: '/scores-list',
            icon: <TableOutlined style={{ color: '#ec4899', fontSize: '18px' }} />, // Pink
            label: <span style={{ fontWeight: 500 }}>成绩清单</span>,
            onClick: () => navigate('/scores-list'),
        },
        {
            key: 'analysis-group',
            icon: <BulbOutlined style={{ color: '#ef4444', fontSize: '18px' }} />, // Red
            label: <span style={{ fontWeight: 500 }}>AI 分析</span>,
            children: [
                {
                    key: '/analysis',
                    label: 'AI 智能分析',
                    onClick: () => navigate('/analysis'),
                },
                {
                    key: '/analysis/subject',
                    label: '学生学科分析',
                    onClick: () => navigate('/analysis/subject'),
                },
                {
                    key: '/analysis/comparison',
                    label: '学科横向对比',
                    onClick: () => navigate('/analysis/comparison'),
                },
            ],
        },
    ];

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: () => {
                logout();
                navigate('/login');
            },
        },
    ];

    return (
        <AntLayout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed} width={260} className="modern-sidebar">
                <div
                    style={{
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        letterSpacing: '0.5px',
                    }}
                >
                    {collapsed ? '成绩' : '成绩管理系统'}
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    style={{ borderRight: 0, background: 'transparent' }}
                />
            </Sider>
            <AntLayout style={{ background: '#f8fafc' }}>
                <Header className="glass-header" style={{ padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{ fontSize: 16, width: 64, height: 64, color: '#1e293b' }}
                    />
                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#1e293b' }}>
                            <Avatar icon={<UserOutlined />} style={{ marginRight: 8, backgroundColor: '#6366f1' }} />
                            <span style={{ fontWeight: 500 }}>{user?.name || user?.username}</span>
                        </div>
                    </Dropdown>
                </Header>
                <Content
                    style={{
                        margin: '24px',
                        padding: 0,
                        minHeight: 280,
                    }}
                >
                    {children}
                </Content>
            </AntLayout>
        </AntLayout >
    );
}
