# 🚀 小学成绩管理系统 (Elementary School Grade Management System)

这是一个高性能、智能化的 Serverless 小学成绩管理系统，旨在通过高效的批量导入、深度的智能分析和现代化的用户界面，提升成绩管理的效率和教学指导的质量。

## ✨ 核心特性

- **高效管理**：支持 Excel 批量导入学生和成绩，快速完成数据录入。
- **智能分析**：集成 Cloudflare Workers AI，自动生成班级成绩总结和学生个性化学习建议。
- **深度洞察**：提供多维度的图表分析，包括雷达图、趋势图、班级对比和成绩分段统计。
- **全栈 Serverless**：基于 Cloudflare Workers, Pages, D1, R2 构建，低成本、高可用。
- **现代化 UI**：采用 React + Ant Design 构建，界面美观、交互流畅。

## 🛠 技术栈

| 类别 | 技术/服务 | 说明 |
|------|----------|------|
| **前端** | React 18, TypeScript, Vite | 高性能单页应用 |
| **UI 框架** | Ant Design | 企业级 UI 设计语言 |
| **图表库** | Recharts | 强大的数据可视化库 |
| **后端** | Cloudflare Workers (Hono.js) | 轻量级、高性能的 API 服务 |
| **数据库** | Cloudflare D1 | 原生 Serverless SQL 数据库 |
| **存储** | Cloudflare R2 | 对象存储，用于考卷和文件 |
| **AI** | Cloudflare Workers AI | LLM 推理，用于智能分析 |

## 📂 目录结构

```
bao-class/
├── api/                # 后端代码 (Cloudflare Workers)
│   ├── src/
│   │   ├── db/         # 数据库 Schema
│   │   ├── routes/     # API 路由
│   │   └── index.ts    # 入口文件
│   └── wrangler.toml   # Cloudflare 配置
├── frontend/           # 前端代码 (React)
│   ├── src/
│   │   ├── components/ # 公共组件
│   │   ├── pages/      # 页面组件
│   │   ├── services/   # API 请求服务
│   │   └── store/      # 状态管理 (Zustand)
│   └── vite.config.ts  # Vite 配置
└── README.md           # 项目说明文档
```

## 🚀 快速开始

### 1. 环境要求

- Node.js 18+
- Cloudflare 账号 (用于部署和数据库)
- Wrangler CLI (`npm install -g wrangler`)

### 2. 安装依赖

```bash
# 克隆项目
git clone https://github.com/Misaka450/bao-class.git
cd bao-class

# 安装后端依赖
cd api
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 3. 数据库配置 (Cloudflare D1)

```bash
# 在 api 目录下执行

# 1. 创建 D1 数据库
wrangler d1 create class

# 2. 更新 wrangler.toml 中的 database_id

# 3. 初始化表结构
wrangler d1 execute class --file=src/db/schema.sql

# 4. (可选) 插入测试数据
wrangler d1 execute class --command "INSERT INTO users (username, password, role, name) VALUES ('admin', 'password', 'admin', '管理员')"
```

### 4. 本地开发

**启动后端服务：**

```bash
cd api
npm run dev
# API 服务将运行在 http://localhost:8787
```

**启动前端服务：**

```bash
cd frontend
# 确保 .env.development 中 VITE_API_URL=http://localhost:8787/api
npm run dev
# 前端页面将运行在 http://localhost:5173
```

## 📦 部署

本项目支持前后端分离部署到 Cloudflare。

### 后端部署

```bash
cd api
wrangler deploy
```

### 前端部署

```bash
cd frontend
npm run build
wrangler pages deploy dist
```

## 📄 许可证

MIT License
