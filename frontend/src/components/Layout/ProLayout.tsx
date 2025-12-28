import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogoutOutlined, UserOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { ProLayout, PageContainer } from '@ant-design/pro-layout';
import { Dropdown, Avatar, Progress } from 'antd';
import type { MenuProps } from 'antd';
import { useAuthStore } from '../../store/authStore';
import routes, { filterRoutesByAccess, generateBreadcrumbs } from '../../config/routes';
import { designTokens } from '../../config/theme';
import { useResponsiveLayout } from '../../hooks/useResponsive';
import { aiApi } from '../../services/api';

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
  const [aiUsage, setAiUsage] = useState<{ used: number; total: number; remaining: number } | null>(() => {
    const cached = localStorage.getItem('ai_usage_cache');
    return cached ? JSON.parse(cached) : null;
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  // 获取 AI 用量的公共方法（带防抖）
  const lastFetchTime = useRef(0);
  const fetchAiUsage = useCallback(() => {
    const now = Date.now();
    // 防抖：1秒内不重复请求
    if (now - lastFetchTime.current < 1000) return;
    lastFetchTime.current = now;

    aiApi.getUsage().then(res => {
      if (res.success && res.data) {
        setAiUsage(res.data);
        localStorage.setItem('ai_usage_cache', JSON.stringify(res.data));
      }
    }).catch(() => { });
  }, []);

  // 1. 初始化加载
  useEffect(() => {
    fetchAiUsage();
  }, []);

  // 2. 监听自定义更新事件 (用于 AI 对话后自动刷新)
  useEffect(() => {
    const handleUpdate = () => fetchAiUsage();
    window.addEventListener('ai-usage-update', handleUpdate);
    return () => window.removeEventListener('ai-usage-update', handleUpdate);
  }, []);

  // 3. 跟踪 Dropdown 展开状态，展开时也刷新一下确保最新
  useEffect(() => {
    if (dropdownOpen) {
      fetchAiUsage();
    }
  }, [dropdownOpen]);

  // 用户下拉菜单配置
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'ai-usage',
      icon: <ThunderboltOutlined style={{ color: aiUsage && aiUsage.remaining < 50 ? '#ff4757' : '#6C5DD3' }} />,
      label: (
        <div style={{ minWidth: 180 }}>
          <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
            今日 AI 额度
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={aiUsage ? (aiUsage.used / aiUsage.total) * 100 : 0}
              size="small"
              strokeColor={aiUsage && aiUsage.remaining < 50 ? '#ff4757' : '#6C5DD3'}
              showInfo={false}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {aiUsage ? `${aiUsage.used}/${aiUsage.total}` : '加载中...'}
            </span>
          </div>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider',
    },
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
    title: '智慧班级助手',
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
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
            onOpenChange={(open) => setDropdownOpen(open)}
          >
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
            itemRender: (route) => (
              <span>{route.title}</span>
            ),
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