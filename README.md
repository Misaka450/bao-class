# 🎓 小学成绩管理系统

一个现代化、智能化的小学成绩管理系统，采用 Serverless 全栈架构，部署在 Cloudflare 平台。

[![部署状态](https://github.com/Misaka450/bao-class/actions/workflows/deploy.yml/badge.svg)](https://github.com/Misaka450/bao-class/actions)
[![技术栈](https://img.shields.io/badge/Tech-React%2019%20%7C%20TypeScript%20%7C%20Cloudflare-blue)](https://github.com/Misaka450/bao-class)

## ✨ 核心特性

### 📊 成绩管理
- **批量导入** - 支持 Excel 文件批量导入成绩数据
- **实时统计** - 自动计算班级排名、平均分、及格率等指标
- **数据导出** - 支持导出成绩报表和分析结果

### 🤖 AI 智能分析
- **智能评语生成** - 基于 Cloudflare Workers AI 自动生成个性化学生评语
- **成绩趋势分析** - 智能识别学生进步或退步趋势
- **薄弱群体识别** - 自动标记需要重点关注的学生

### 📈 数据可视化
- **仪表盘概览** - 直观展示关键数据指标
- **班级分析** - 多维度成绩对比和趋势分析
- **学生档案** - 个人成绩历史、学科雷达图
- **重点关注** - 临界生、波动生、退步生自动筛选

### 🔐 系统功能
- **用户认证** - 基于 JWT 的安全认证
- **权限管理** - 管理员、教师角色权限隔离
- **操作日志** - 完整的审计日志记录
- **响应式设计** - 支持桌面端和移动端访问

## 🛠️ 技术栈

### 前端
- **React 19** + **TypeScript** - 现代化 UI 框架
- **Vite 6** - 极速构建工具
- **Ant Design v5** + **Ant Design Pro** - 企业级 UI 组件
- **Recharts** - 数据可视化图表
- **React Query** - 服务端状态管理
- **Zustand** - 客户端状态管理
- **React Router v7** - 路由管理

### 后端
- **Hono.js** - 轻量级 Web 框架（运行在 Cloudflare Workers）
- **Cloudflare D1** - Serverless SQLite 数据库
- **Cloudflare Workers AI** - 边缘计算 AI 推理
- **JWT** - 身份认证
- **XLSX** - Excel 文件处理

### 基础设施
- **Cloudflare Workers** - 边缘计算平台（后端 API）
- **Cloudflare Pages** - 静态网站托管（前端）
- **GitHub Actions** - CI/CD 自动化部署

### 开发工具
- **npm workspaces** - Monorepo 项目管理
- **TypeScript** - 类型安全
- **ESLint** + **Prettier** - 代码质量

## 📦 项目结构

```
bao-class/                      # Monorepo 根目录
├── api/                        # 后端服务
│   ├── src/
│   │   ├── index.ts           # Workers 入口
│   │   ├── routes/            # API 路由
│   │   │   ├── auth.ts        # 认证
│   │   │   ├── scores.ts      # 成绩管理
│   │   │   ├── analysis.ts    # 数据分析
│   │   │   └── ai.ts          # AI 功能
│   │   ├── services/          # 业务逻辑
│   │   ├── middleware/        # 中间件
│   │   └── db/               # 数据库
│   │       ├── schema.sql     # 表结构
│   │       └── test-data-v4.sql # 测试数据
│   └── wrangler.toml          # Cloudflare 配置
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   │   ├── Dashboard.tsx  # 仪表盘
│   │   │   ├── ScoresList.tsx # 成绩列表
│   │   │   ├── ClassAnalysis.tsx # 班级分析
│   │   │   ├── StudentProfile.tsx # 学生档案
│   │   │   └── ManagementAlerts.tsx # 重点关注
│   │   ├── components/        # 公共组件
│   │   ├── services/          # API 服务
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── store/             # 状态管理
│   │   └── types/             # 类型定义
│   └── vite.config.ts         # Vite 配置
│
├── packages/                   # 共享包
│   └── types/                 # 共享类型定义
│
├── scripts/                    # 开发脚本
│   └── fix_ai_response_v5.js  # AI 调试工具
│
├── .github/
│   └── workflows/
│       └── deploy.yml         # 自动部署配置
│
└── package.json               # Monorepo 配置
```

## 🚀 快速开始

### 环境要求

- **Node.js** 20.x 或更高
- **npm** 10.x 或更高
- **Cloudflare 账户**（用于部署）

### 本地开发

#### 1. 克隆项目

```bash
git clone https://github.com/Misaka450/bao-class.git
cd bao-class
```

#### 2. 安装依赖

由于项目使用 npm workspaces，在根目录统一安装：

```bash
npm install
```

#### 3. 启动后端

```bash
cd api
npm run dev
```

后端将运行在 `http://localhost:8787`

#### 4. 启动前端

在新终端窗口：

```bash
cd frontend
npm run dev
```

前端将运行在 `http://localhost:3000`

#### 5. 初始化数据库

访问以下 URL 初始化数据库和测试数据：

```
http://localhost:8787/api/init/all
```

#### 6. 登录系统

**默认管理员账号**：
- 用户名：`admin`
- 密码：`baobao123`

## 📚 核心功能使用

### 成绩导入

1. 进入「数据导入」页面
2. 下载 Excel 模板
3. 按模板格式填写成绩数据
4. 上传文件完成导入

### AI 评语生成

1. 进入「学生档案」页面
2. 选择学生查看详情
3. 点击「生成 AI 评语」按钮
4. 系统自动分析学生成绩并生成个性化评语

### 重点关注名单

系统自动识别以下类型学生：

- **临界生**：距离及格线或优秀线仅差 1-5 分
- **退步生**：连续考试成绩显著下降
- **波动生**：成绩起伏较大，不稳定
- **偏科生**：学科成绩差异过大

## 🔧 开发指南

### 代码规范

```bash
# 格式化代码
npm run format

# 代码检查
npm run lint
```

### 类型检查

```bash
# 前端类型检查
cd frontend
npx tsc -p tsconfig.app.json --noEmit

# 后端类型检查
cd api
npx tsc --noEmit
```

### 构建项目

```bash
# 构建前端
cd frontend
npm run build

# 构建后端
cd api
npm run build
```

## 🚀 部署

### 自动部署（推荐）

项目配置了 GitHub Actions，推送到 `master` 分支会自动部署。

#### 配置步骤

1. **在 Cloudflare 创建 API Token**

   访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)，创建具有以下权限的 Token：
   - Workers Scripts: Edit
   - Cloudflare Pages: Edit
   - D1: Edit

2. **配置 GitHub Secrets**

   在 GitHub 仓库设置中添加以下 Secrets：
   - `CLOUDFLARE_API_TOKEN` - 上一步创建的 API Token
   - `CLOUDFLARE_ACCOUNT_ID` - Cloudflare 账户 ID

3. **推送代码触发部署**

   ```bash
   git push origin master
   ```

4. **查看部署状态**

   在 GitHub Actions 页面查看部署进度和日志

### 手动部署

#### 部署后端

```bash
cd api
npx wrangler deploy
```

#### 部署前端

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=bao-class
```

## 📖 API 文档

### 认证相关

- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取当前用户信息

### 成绩管理

- `GET /api/scores` - 获取成绩列表
- `POST /api/scores` - 添加成绩
- `PUT /api/scores/:id` - 更新成绩
- `DELETE /api/scores/:id` - 删除成绩

### 数据分析

- `GET /api/analysis/class/:classId` - 班级分析
- `GET /api/analysis/student/:studentId` - 学生分析
- `GET /api/analysis/focus/:classId` - 重点关注名单

### AI 功能

- `POST /api/ai/generate-comment` - 生成学生评语
- `GET /api/ai/comment-history/:studentId` - 评语历史

详细 API 文档请参考 [API_DOCS.md](./API_DOCS.md)

## 🔒 安全说明

- 所有 API 请求需要携带 JWT Token
- 密码使用 bcrypt 加密存储
- 生产环境请修改默认密码和 JWT_SECRET
- 建议启用 HTTPS 访问

## 🧪 测试

```bash
# 运行前端测试
cd frontend
npm test

# 运行后端测试（如有）
cd api
npm test
```

## 📝 更新日志

### v1.0.0 (2025-12)
- ✅ 完整的成绩管理功能
- ✅ AI 智能评语生成
- ✅ 数据分析和可视化
- ✅ 重点关注名单
- ✅ 自动化 CI/CD 部署
- ✅ React 19 + TypeScript 升级
- ✅ Monorepo 架构重构

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Cloudflare](https://www.cloudflare.com/) - 提供强大的边缘计算平台
- [Ant Design](https://ant.design/) - 优秀的 React UI 组件库
- [Hono.js](https://hono.dev/) - 轻量级 Web 框架

## 📞 联系方式

- 项目主页：[https://github.com/Misaka450/bao-class](https://github.com/Misaka450/bao-class)
- Issue 反馈：[GitHub Issues](https://github.com/Misaka450/bao-class/issues)

---

⭐ 如果这个项目对你有帮助，欢迎 Star 支持！
