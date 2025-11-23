import { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Button, Dropdown, Avatar, Drawer, Grid } from 'antd';
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
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Header, Sider, Content } = AntLayout;
const { useBreakpoint } = Grid;

export default function Layout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const screens = useBreakpoint();

    // 判断是否为移动设备（宽度 < 768px）
    const isMobile = !screens.md;

    // 监听屏幕尺寸变化，移动端自动关闭 Drawer
    useEffect(() => {
        if (!isMobile && mobileDrawerVisible) {
            setMobileDrawerVisible(false);
        }
    }, [isMobile, mobileDrawerVisible]);

    const menuItems: MenuProps['items'] = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined style={{ color: '#3b82f6', fontSize: '18px' }} />, // Blue
            label: <span style={{ fontWeight: 500 }}>仪表盘</span>,
            onClick: () => {
                navigate('/dashboard');
                if (isMobile) setMobileDrawerVisible(false);
            },
        },
        {
            key: '/classes',
            icon: <TeamOutlined style={{ color: '#10b981', fontSize: '18px' }} />, // Emerald
            label: <span style={{ fontWeight: 500 }}>班级管理</span>,
            onClick: () => {
                navigate('/classes');
                if (isMobile) setMobileDrawerVisible(false);
            },
        },
        {
            key: '/students',
            icon: <UserOutlined style={{ color: '#f59e0b', fontSize: '18px' }} />, // Amber
            label: <span style={{ fontWeight: 500 }}>学生管理</span>,
            onClick: () => {
                navigate('/students');
                if (isMobile) setMobileDrawerVisible(false);
            },
        },
        {
            key: 'teaching',
            icon: <BookOutlined style={{ color: '#8b5cf6', fontSize: '18px' }} />, // Violet
            label: <span style={{ fontWeight: 500 }}>教学管理</span>,
            children: [
                {
                    key: '/courses',
                    label: '课程管理',
                    onClick: () => {
                        navigate('/courses');
                        if (isMobile) setMobileDrawerVisible(false);
                    },
                },
                {
                    key: '/exams',
                    label: '考试管理',
                    onClick: () => {
                        navigate('/exams');
                        if (isMobile) setMobileDrawerVisible(false);
                    },
                },
                {
                    key: '/import',
                    label: '数据导入',
                    onClick: () => {
                        navigate('/import');
                        if (isMobile) setMobileDrawerVisible(false);
                    },
                },
            ],
        },
        {
            key: '/scores-list',
            icon: <TableOutlined style={{ color: '#ec4899', fontSize: '18px' }} />, // Pink
            label: <span style={{ fontWeight: 500 }}>成绩清单</span>,
            onClick: () => {
                navigate('/scores-list');
                if (isMobile) setMobileDrawerVisible(false);
            },
        },
        {
            key: '/audit-logs',
            icon: <SafetyCertificateOutlined style={{ color: '#64748b', fontSize: '18px' }} />, // Slate
            label: <span style={{ fontWeight: 500 }}>操作日志</span>,
            onClick: () => {
                navigate('/audit-logs');
                if (isMobile) setMobileDrawerVisible(false);
            },
        },
        {
            key: 'analysis-group',
            icon: <BulbOutlined style={{ color: '#ef4444', fontSize: '18px' }} />, // Red
            label: <span style={{ fontWeight: 500 }}>数据分析</span>,
            children: [
                {
                    key: '/analysis/class',
                    label: '班级成绩走势',
                    onClick: () => {
                        navigate('/analysis/class');
                        if (isMobile) setMobileDrawerVisible(false);
                    },
                },
                {
                    key: '/analysis/alerts',
                    label: '管理预警',
                    onClick: () => {
                        navigate('/analysis/alerts');
                        if (isMobile) setMobileDrawerVisible(false);
                    },
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

    // 侧边栏内容组件
    const SidebarContent = () => (
        <>
            <div
                style={{
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? 18 : 20,
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    letterSpacing: '0.5px',
                }}
            >
                {collapsed && !isMobile ? '成绩' : '成绩管理系统'}
            </div>
            <Menu
                theme="light"
                mode="inline"
                selectedKeys={[location.pathname]}
                items={menuItems}
                style={{ borderRight: 0, background: 'transparent' }}
            />
        </>
    );

    return (
        <AntLayout style={{ minHeight: '100vh' }}>
            {/* 桌面端：固定侧边栏 */}
            {!isMobile && (
                <Sider trigger={null} collapsible collapsed={collapsed} width={260} className="modern-sidebar" theme="light">
                    <SidebarContent />
                </Sider>
            )}

            {/* 移动端：抽屉式侧边栏 */}
            {isMobile && (
                <Drawer
                    placement="left"
                    open={mobileDrawerVisible}
                    onClose={() => setMobileDrawerVisible(false)}
                    width={260}
                    styles={{ body: { padding: 0, background: '#fff' } }}
                    className="modern-sidebar"
                >
                    <SidebarContent />
                </Drawer>
            )}

            <AntLayout style={{ background: '#f8fafc' }}>
                <Header className="glass-header" style={{
                    padding: isMobile ? '0 16px' : '0 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#fff',
                }}>
                    <Button
                        type="text"
                        icon={
                            isMobile
                                ? <MenuUnfoldOutlined />
                                : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)
                        }
                        onClick={() => isMobile ? setMobileDrawerVisible(true) : setCollapsed(!collapsed)}
                        style={{ fontSize: 16, width: 64, height: 64, color: '#1e293b' }}
                    />
                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#1e293b' }}>
                            <Avatar icon={<UserOutlined />} style={{ marginRight: isMobile ? 0 : 8, backgroundColor: '#6366f1' }} />
                            {!isMobile && <span style={{ fontWeight: 500 }}>{user?.name || user?.username}</span>}
                        </div>
                    </Dropdown>
                </Header>
                <Content
                    style={{
                        margin: isMobile ? '16px' : '24px',
                        padding: 0,
                        minHeight: 280,
                    }}
                >
                    {children}
                </Content>
            </AntLayout>
        </AntLayout>
    );
}
