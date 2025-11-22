// 前后端分离部署配置
// 生产环境：前端部署在 Cloudflare Pages，后端在 Workers
// 开发环境：前端 localhost:5173，后端 localhost:8787
export const API_BASE_URL = import.meta.env.PROD
    ? 'https://api.980823.xyz'  // 生产环境后端 API 地址
    : 'http://localhost:8787';
