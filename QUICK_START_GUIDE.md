# 快速开始指南

## 🌐 应用地址

- **前端**: https://bao-class.pages.dev
- **后端 API**: https://api.980823.xyz

---

## 🚀 快速访问

### 1. 打开应用
在浏览器中访问: https://bao-class.pages.dev

### 2. 查看登录页面
应该看到一个登录表单，包含:
- 用户名输入框
- 密码输入框
- 登录按钮

### 3. 输入凭证
使用有效的用户名和密码进行登录

### 4. 验证成功
登录成功后，应该看到应用的主界面

---

## 🔍 故障排查

### 页面显示空白
1. 清除浏览器缓存 (Ctrl+Shift+Delete)
2. 刷新页面 (F5)
3. 在隐私模式下打开应用
4. 尝试不同的浏览器

### 登录失败
1. 检查用户名和密码是否正确
2. 检查网络连接
3. 打开浏览器开发者工具 (F12) 查看错误信息
4. 检查 Network 标签中的 API 请求

### 控制台错误
1. 打开浏览器开发者工具 (F12)
2. 查看 Console 标签
3. 记录错误信息
4. 检查 Network 标签中的失败请求

---

## 🛠️ 开发者信息

### 前端技术栈
- React 19.2.0
- TypeScript 5.6.2
- Vite 6.0.1
- Ant Design 6.1.1
- React Router 7.9.6
- Zustand 5.0.8

### 后端技术栈
- Hono (Cloudflare Workers)
- Cloudflare D1 (SQLite)
- JWT 认证

### 部署平台
- 前端: Cloudflare Pages
- 后端: Cloudflare Workers

---

## 📝 常见问题

### Q: 应用加载很慢
A: 这是正常的，因为 JavaScript 包很大 (3.2 MB)。首次加载可能需要几秒钟。

### Q: 登录后页面仍然显示登录页面
A: 这可能是因为:
1. 登录请求失败
2. Token 没有正确保存
3. 应用没有正确识别 Token

检查浏览器开发者工具中的 Network 和 Console 标签。

### Q: API 请求失败
A: 检查:
1. 网络连接是否正常
2. API 服务是否在线 (https://api.980823.xyz)
3. 请求是否包含正确的 Content-Type 头
4. CORS 是否配置正确

---

## 🔐 安全信息

### Token 存储
- Token 存储在 localStorage 中
- 键名: `token`
- 在浏览器关闭时不会自动清除

### 清除 Token
在浏览器控制台运行:
```javascript
localStorage.removeItem('token');
window.location.reload();
```

---

## 📊 性能指标

- **首屏加载时间**: ~2-3 秒
- **JavaScript 大小**: 3.2 MB (gzip: 985 KB)
- **CSS 大小**: 9.4 KB (gzip: 2.5 KB)
- **HTML 大小**: 0.5 KB (gzip: 0.3 KB)

---

## 🎯 功能清单

### 已实现
- ✅ 登录页面
- ✅ 错误处理
- ✅ 响应式设计
- ✅ 主题支持

### 待实现
- ⏳ 学生管理
- ⏳ 班级管理
- ⏳ 成绩管理
- ⏳ 统计分析

---

## 📞 支持

### 报告问题
1. 打开浏览器开发者工具 (F12)
2. 复制 Console 中的错误信息
3. 复制 Network 标签中的失败请求
4. 提供问题描述和重现步骤

### 获取帮助
- 检查本文档中的故障排查部分
- 查看浏览器开发者工具中的错误信息
- 检查应用的诊断信息

---

## 🎉 开始使用

现在您已经准备好使用应用了！

1. 访问 https://bao-class.pages.dev
2. 输入用户名和密码
3. 开始使用应用

祝您使用愉快！

---

**最后更新**: 2024年12月18日  
**版本**: 3.0.0  
**状态**: ✅ 生产就绪

