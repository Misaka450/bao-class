import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { ProLayout, PageContainer } from '@ant-design/pro-layout';
import { Dropdown, Avatar } from 'antd';
import type { MenuProps } from 'antd';
import { useAuthStore } from '../../store/authStore';
import routes, { filterRoutesByAccess, generateBreadcrumbs, getPageTitle } from '../../config/routes';
import { usePageTitle, useRouteChange } from '../../utils/route';
import { designTokens } from '../../config/theme';
import { useResponsiveLayout } from '../../hooks/useResponsive';

interface ProLayoutConfig {
  title: string;
  logo?: string | React.ReactNode;
  layout: 'side' | 'top' | 'mix';
  theme: 'light' | 'dark';
  userInfo: {
    name?: string;
    avatar?: string;
  };
}

export default function ProLayoutWrapper({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [pathname, setPathname] = useState(location.pathname);
  const [collapsed, setCollapsed] = useState(false);

  // Get responsive layout settings
  const responsiveLayout = useResponsiveLayout();

  // 监听路由变化，更新当前路径
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => setPathname(location.pathname), 0);
  }, [location.pathname]);

  // Filter routes based on user access
  const accessibleRoutes = user ? filterRoutesByAccess(routes, user.role) : [];

  // Generate breadcrumbs for current path
  const breadcrumbs = generateBreadcrumbs(pathname);

  // 用户下拉菜单配置
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

  // ProLayout 配置 - 使用响应式设置
  const layoutConfig: ProLayoutConfig = {
    title: '成绩管理系统',
    layout: responsiveLayout.layout as 'side' | 'top' | 'mix',
    theme: 'light',
    userInfo: {
      name: user?.name || user?.username,
      avatar: user?.avatar,
    },
  };

  return (
    <ProLayout
      title={layoutConfig.title}
      logo={false}
      layout={layoutConfig.layout}
      splitMenus={responsiveLayout.splitMenus}
      contentWidth={responsiveLayout.contentWidth}
      fixedHeader={responsiveLayout.fixedHeader}
      fixSiderbar={responsiveLayout.fixSiderbar}
      colorPrimary={designTokens.colorPrimary}
      // Responsive design settings
      breakpoint={responsiveLayout.breakpoint as any}
      collapsed={collapsed}
      onCollapse={(collapsed) => {
        setCollapsed(collapsed);
      }}
      // Sider settings
      siderWidth={responsiveLayout.siderWidth}
      // @ts-ignore - ProLayout 实际支持此属性
      collapsedWidth={48}
      headerContentRender={() => null}
      // Menu settings
      menuProps={{
        style: {
          border: 'none',
        },
      }}
      location={{
        pathname,
      }}
      navTheme="light"
      siderMenuType="group"
      menu={{
        locale: false,
        request: async () => accessibleRoutes,
      }}
      menuItemRender={(item, dom) => (
        <Link to={item.path || '/'}>{dom}</Link>
      )}
      avatarProps={{
        src: layoutConfig.userInfo.avatar,
        title: layoutConfig.userInfo.name,
        render: (_, avatarChildren) => (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <div className="header-user-info" style={{
              display: 'flex',
              alignItems: 'center',
              gap: responsiveLayout.isMobile ? 8 : 12,
              padding: '6px 12px',
              borderRadius: '12px',
              transition: 'background-color 0.2s',
              background: 'rgba(0,0,0,0.02)',
              cursor: 'pointer'
            }}>
              <Avatar
                style={{
                  backgroundColor: 'var(--primary-color)',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)'
                }}
                icon={<UserOutlined />}
                src={layoutConfig.userInfo.avatar}
                size={responsiveLayout.isMobile ? 'small' : 'default'}
              />
              {!responsiveLayout.isMobile && (
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {layoutConfig.userInfo.name}
                </span>
              )}
            </div>
          </Dropdown>
        ),
      }}
      onPageChange={(location) => {
        // 如果没有登录，重定向到登录页
        if (!user && location?.pathname !== '/login') {
          navigate('/login');
        }
      }}
      onMenuHeaderClick={() => navigate('/dashboard')}
    >
      <PageContainer
        header={{
          breadcrumb: responsiveLayout.isMobile ? undefined : {
            items: breadcrumbs.map(item => ({
              path: item.path,
              title: item.name,
            })),
            itemRender: (route, params, routes, paths) => {
              const last = routes.indexOf(route) === routes.length - 1;
              return last ? (
                <span>{route.title}</span>
              ) : (
                <Link to={route.path || '/'}>{route.title}</Link>
              );
            },
          },
          title: false,
          style: {
            padding: responsiveLayout.isMobile ? '12px 16px' : '16px 24px',
          },
        }}
        content={responsiveLayout.isMobile ? undefined : ''}
        tabBarExtraContent={responsiveLayout.isMobile ? undefined : ''}
      >
        <div style={{
          padding: responsiveLayout.isMobile ? '16px' : '24px',
          minHeight: 'calc(100vh - 112px)', // Adjust for header
        }}>
          {children}
        </div>
      </PageContainer>
    </ProLayout>
  );
}