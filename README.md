# 🎓 智慧班级助手

一个现代化、智能化的小学班级管理系统，采用 Serverless 全栈架构，部署在 Cloudflare 平台。集成 AI 智能备课、成绩管理与数据分析等功能。

[![部署状态](https://github.com/Misaka450/bao-class/actions/workflows/deploy.yml/badge.svg)](https://github.com/Misaka450/bao-class/actions)
[![技术栈](https://img.shields.io/badge/Tech-React%2019%20%7C%20TypeScript%20%7C%20Cloudflare-blue)](https://github.com/Misaka450/bao-class)

## ✨ 核心特性

### 🤖 AI 智能助手
- **AI 智能聊天** - 支持自然语言查询班级数据、学生成绩，快速获取教学洞察
- **AI 教案生成** - 基于 DeepSeek-V3.2 智能生成小学各科教案，支持自定义教学目标和重难点
- **AI 作业生成** - 智能生成分层练习题（基础/提高/拓展），支持历史管理
- **智能评语生成** - 自动生成个性化学生评语，支持批量生成与风格选择（正式/友好/简洁）
- **班级学情报告** - 深度分析班级多维度数据，生成 800-1000 字的专业诊断报告
- **智能 OCR 识别** - 使用 Qwen3-VL 模型从成绩单照片中提取结构化成绩数据

### 📊 成绩管理
- **批量导入** - 支持 Excel 文件批量导入成绩数据
- **AI 智能识别** - 支持上传成绩单图片，使用 AI 模型自动识别成绩
- **实时统计** - 自动计算班级排名、平均分、及格率等指标
- **数据导出** - 支持导出成绩报表和分析结果

### 📈 数据可视化
- **仪表盘概览** - 直观展示关键数据指标
- **班级学情分析** - 多维度成绩对比和趋势分析
  - 年级班级对比分析
  - 各科目成绩分布图
  - 班级趋势变化图
  - 学生成绩排名位置图
- **学生档案** - 个人成绩历史、学科雷达图、成绩波动分析
- **重点关注** - 临界生、波动生、退步生、偏科生自动筛选

### 🔐 系统功能
- **全方位权限控制** - 管理员、班主任、科任教师三级权限隔离，支持班级/科目精细授权
- **统一 LLM 客户端** - 集中管理 AI 调用，支持额度控制与错误处理
- **响应式极致体验** - 深度适配移动端操作，支持侧边栏折叠、卡片式布局自由切换
- **暗色主题支持** - 现代化视觉设计，支持系统主题跟随与手动切换

## 🛠️ 技术栈

### 前端
| 技术 | 版本 | 说明 |
|------|------|------|
| **React** | 19.2.x | 现代化 UI 框架 |
| **TypeScript** | 5.6.x | 类型安全 |
| **Vite** | 6.x | 极速构建工具 |
| **Ant Design** | 5.24.x | 企业级 UI 组件库 |
| **Ant Design Pro Components** | 2.8.x | ProTable/ProLayout 企业级组件 |
| **Recharts** | 3.4.x | 数据可视化图表 |
| **React Query** | 5.x | 服务端状态管理 |
| **Zustand** | 5.x | 客户端状态管理 |
| **React Router** | 7.x | 路由管理 |

### 后端
| 技术 | 版本 | 说明 |
|------|------|------|
| **Hono.js** | 4.x | 轻量级 Web 框架（运行在 Cloudflare Workers） |
| **Cloudflare D1** | - | Serverless SQLite 数据库 |
| **Cloudflare KV** | - | 高性能分布式 Key-Value 存储 (用于评语缓存) |
| **AI 模型** | - | DeepSeek-V3.2 (评语报告) / Qwen3-VL (OCR) |
| **Cloudflare R2** | - | 对象存储（图片/文件） |
| **Zod** | 4.x | 运行时类型校验 |
| **XLSX** | 0.18.x | Excel 文件处理 |

### 基础设施
- **Cloudflare Workers** - 边缘计算平台（后端 API）
- **Cloudflare Pages** - 静态网站托管（前端）
- **Cloudflare R2** - 对象存储（相册/文件）
- **Cloudflare Image Resizing** - 动态图片优化
- **GitHub Actions** - CI/CD 自动化部署

### 开发工具
- **npm workspaces** - Monorepo 项目管理
- **ESLint** + **Prettier** - 代码质量
- **Vitest** - 单元测试框架

## 📦 项目结构

```
bao-class/                      # Monorepo 根目录
├── api/                        # 后端服务
│   ├── src/
│   │   ├── index.ts           # Workers 入口
│   │   ├── routes/            # API 路由
│   │   │   ├── ai.ts          # AI 评语与报告
│   │   │   ├── ai-chat.ts     # AI 智能聊天接口
│   │   │   ├── lesson-prep.ts # AI 备课/作业接口
│   │   │   └── ...            # 其他路由 (分页支持)
│   │   ├── services/          # 业务逻辑服务
│   │   │   ├── ai-chat.service.ts    # AI 聊天服务
│   │   │   └── lesson-prep.service.ts # AI 备课服务
│   │   ├── middleware/        # 中间件 (Auth/Cache/RateLimit)
│   │   ├── schemas/           # Zod 验证模式
│   │   ├── utils/             # 工具函数
│   │   │   ├── llmClient.ts   # 统一 LLM 调用客户端
│   │   │   ├── aiQuota.ts     # AI 额度管理
│   │   │   └── ...            # 其他工具
│   │   └── db/               # 数据库
│   │       ├── schema.sql     # 基础表结构
│   │       └── migrations/    # 数据库迁移
│   └── wrangler.toml          # Cloudflare 配置
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   │   ├── ProDashboard.tsx      # 仪表盘
│   │   │   ├── LessonPrep.tsx        # AI 备课生成
│   │   │   ├── MyLessonPlans.tsx     # 我的教案
│   │   │   ├── HomeworkGenerator.tsx # AI 作业生成
│   │   │   ├── MyHomework.tsx        # 我的作业
│   │   │   ├── ClassAnalysis.tsx     # 班级学情分析
│   │   │   ├── StudentProfile.tsx    # 学生档案
│   │   │   ├── ManagementAlerts.tsx  # 重点关注
│   │   │   └── ...                   # 其他页面
│   │   ├── components/        # 公共组件
│   │   │   ├── Charts/        # 图表组件
│   │   │   └── ...            # 其他组件
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
- 密码：`admin123`

## 📚 核心功能使用

### 成绩导入

1. 进入「数据导入」页面
2. **Excel 导入**：下载模板，按格式填写后上传
3. **AI 智能识别**：上传成绩单图片，AI 自动识别成绩并匹配学生

### AI 评语生成

1. 进入「学生档案」页面
2. 选择学生查看详情
3. 点击「生成 AI 评语」按钮
4. 系统自动分析学生成绩并生成个性化评语

### 班级学情分析

1. 进入「班级学情分析」页面
2. 选择班级和考试
3. 查看多维度分析图表：
   - 年级班级对比（雷达图）
   - 成绩分布统计（堆叠柱状图）
   - 班级科目趋势（折线图）
   - 学生排名分布（气泡图）
4. 点击「生成 AI 报告」获取深度分析

### 重点关注名单

系统自动识别以下类型学生：

- **临界生**：成绩在 55-62 分区间，处于及格边缘
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

### 运行测试

```bash
# 前端单元测试
cd frontend
npm test

# 运行单次测试
npm run test:run

# 测试覆盖率
npm run test:coverage
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

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/profile` | 获取当前用户信息 |

### 成绩管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/scores` | 获取成绩列表 |
| POST | `/api/scores` | 添加成绩 |
| PUT | `/api/scores/:id` | 更新成绩 |
| DELETE | `/api/scores/:id` | 删除成绩 |

### 数据导入/导出

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/template/grades.xlsx` | 下载成绩导入模板 |
| POST | `/api/import/grades` | Excel 批量导入成绩 |
| POST | `/api/import/ai-scores` | AI 识别图片导入成绩 |
| GET | `/api/export/class/:classId` | 导出班级成绩 |

### 统计分析

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/class/:classId` | 班级统计分析 |
| GET | `/api/stats/profile/:studentId` | 学生档案数据 |
| GET | `/api/stats/class-trend/:classId` | 班级成绩趋势 |
| GET | `/api/stats/class-subject-trend/:classId` | 班级科目趋势 |
| GET | `/api/stats/grade-comparison/:classId` | 年级班级对比 |
| GET | `/api/stats/distribution/:classId` | 成绩分布统计 |
| GET | `/api/stats/rankings/:classId` | 学生排名数据 |

### AI 功能

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/generate-comment` | 生成学生评语 |
| POST | `/api/ai/generate-report` | 生成班级学情报告（流式） |
| POST | `/api/ai/refresh-report` | 刷新班级学情报告 |
| GET | `/api/ai/comment-history/:studentId` | 评语历史 |

### AI 智能备课

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/lesson-prep/generate` | 生成 AI 教案（流式） |
| GET | `/api/lesson-prep/plans` | 获取我的教案列表 |
| GET | `/api/lesson-prep/plans/:id` | 获取教案详情 |
| POST | `/api/lesson-prep/plans` | 保存教案 |
| DELETE | `/api/lesson-prep/plans/:id` | 删除教案 |
| POST | `/api/lesson-prep/homework/generate` | 生成 AI 作业（流式） |
| GET | `/api/lesson-prep/homework` | 获取我的作业列表 |
| DELETE | `/api/lesson-prep/homework/:id` | 删除作业 |

### 分析功能

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/analysis/focus/:classId` | 重点关注名单 |
| GET | `/api/analysis/class/summary/:classId` | 班级分析总结 |

## 🔒 安全说明

- 所有 API 请求需要携带 JWT Token
- 密码使用 bcrypt 加密存储
- 生产环境请修改默认密码和 JWT_SECRET
- 建议启用 HTTPS 访问

## 📝 更新日志

### v1.4.0 (2026-01)
- ✅ AI 智能聊天助手：支持自然语言查询学生成绩、班级数据
- ✅ 后端分页优化：课程、考试、班级、学生管理全面支持分页查询
- ✅ 数据导入模块重构：拆分为学生导入、成绩导入、AI 识别三个独立组件
- ✅ 仪表盘快捷入口：添加常用功能快速访问
- ✅ 批量评语生成：支持按班级批量生成 AI 评语，可选风格
- ✅ API 响应格式统一：标准化 `{ data, total, success }` 响应结构
- ✅ 前端防御性优化：增强数据加载与错误处理

### v1.3.0 (2025-12)
- ✅ 临界生判定优化：调整为 55-62 分（及格边缘），移除优秀线临界判定
- ✅ 数据流优化：AI 报告生成复用前端缓存数据，减少数据库查询
- ✅ AI 额度监控面板完善

### v1.2.0 (2025-12)
- ✅ AI 智能教案生成（支持小学各科目）
- ✅ AI 作业生成（分层练习：基础/提高/拓展）
- ✅ 统一 LLM 客户端（集中管理 AI 调用与额度控制）
- ✅ 系统更名为「智慧班级助手」
- ✅ 菜单结构优化调整
- ✅ SQL 注入漏洞修复
- ✅ 代码质量优化与重构

### v1.1.0 (2025-12)
- ✅ AI 智能识别导入成绩（图片 OCR）
- ✅ 班级学情报告 AI 生成（流式输出）
- ✅ 年级班级对比雷达图
- ✅ 成绩分布堆叠柱状图
- ✅ 学生排名位置气泡图
- ✅ 科任教师管理功能
- ✅ 暗色主题支持
- ✅ 图片预览优化

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
