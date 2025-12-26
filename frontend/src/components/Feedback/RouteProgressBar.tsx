import { useEffect } from 'react';
import NProgress from 'nprogress';
import { useLocation, useNavigation } from 'react-router-dom';
import 'nprogress/nprogress.css';
import { theme } from 'antd';

NProgress.configure({
    showSpinner: false,
    minimum: 0.1,
    speed: 200,
    easing: 'ease',
    trickleSpeed: 200
});

/**
 * 路由进度条组件
 * 监听页面导航状态，控制 NProgress 显示
 */
export function RouteProgressBar() {
    const location = useLocation();
    const navigation = useNavigation(); // 如果使用的是 Data Router (createBrowserRouter)
    const { token } = theme.useToken();

    // 监听路由变化
    useEffect(() => {
        NProgress.start();

        // 短暂延迟后结束，给一点视觉反馈
        const timer = setTimeout(() => {
            NProgress.done();
        }, 200);

        return () => {
            clearTimeout(timer);
            NProgress.done();
        };
    }, [location.pathname, location.search]);

    // 更新进度条颜色以匹配主题
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
      #nprogress .bar {
        background: ${token.colorPrimary} !important;
        height: 3px !important;
      }
      #nprogress .peg {
        box-shadow: 0 0 10px ${token.colorPrimary}, 0 0 5px ${token.colorPrimary} !important;
      }
      #nprogress .spinner-icon {
        border-top-color: ${token.colorPrimary} !important;
        border-left-color: ${token.colorPrimary} !important;
      }
    `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, [token.colorPrimary]);

    return null;
}
