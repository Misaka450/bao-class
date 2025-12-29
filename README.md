# 🎓 小学成绩管理系统

一个现代化、智能化的**小学成绩管理**与**教学辅助**系统，采用 Serverless 全栈架构，部署在 Cloudflare 平台。支持成绩管理、数据分析、AI 智能评语、教案生成、作业生成等功能。

[![部署状态](https://github.com/Misaka450/bao-class/actions/workflows/deploy.yml/badge.svg)](https://github.com/Misaka450/bao-class/actions/workflows/deploy.yml)
[![技术栈](https://img.shields.io/badge/Tech-React%2019%20%7C%20TypeScript%20%7C%20Cloudflare-blue)](https://github.com/Misaka450/bao-class)

## 📋 目录

- [核心特性](#核心特性)
- [功能模块](#功能模块)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [功能使用](#功能使用)
- [开发指南](#开发指南)
- [部署](#部署)

## ✨ 核心特性

### 📊 成绩管理
- **批量导入** - 支持 Excel 文件批量导入成绩数据
- **AI 智能识别** - 支持上传成绩单图片，使用 AI 模型自动识别成绩
- **实时统计** - 自动计算班级排名、平均分、及格率等指标
- **数据导出** - 支持导出成绩报表和分析结果

### 🤖 AI 智能教学
- **智能评语生成** - 基于 DeepSeek-V3.2 自动生成个性化学生评语（支持流式输出、推理思维展示）
- **教案自动生成** - 根据科目、年级、册次、教学主题智能生成完整教案
- **作业智能出题** - 根据知识点、难度、题量智能生成练习题
- **班级学情报告** - 深度分析班级多维度数据，生成专业诊断报告
- **多维度关注群体** - 自动识别临界生、退步生、波动生、偏科生，并给出针对性建议
- **智能 OCR 识别** - 使用 Qwen3-VL 模型从成绩单照片中提取结构化成绩数据

### 📈 数据可视化
- **仪表盘概览** - 直观展示关键数据指标，支持班级/考试/科目多维筛选
- **班级学情分析** - 多维度成绩对比和趋势分析
  - 年级班级对比分析
  - 各科目成绩分布图
  - 班级趋势变化图
  - 学生成绩排名位置图
- **学生档案** - 个人成绩历史、学科雷达图、成绩波动分析
- **重点关注** - 临界生、波动生、退步生、偏科生自动筛选

### 🔐 系统功能
- **全方位权限控制** - 管理员、班主任、科任教师三级权限隔离，支持班级/科目精细授权
- **性能监控与优化** - 内置 Web Vitals 监控及加载时序分析，后端多级缓存机制（KV + 内存）
- **响应式极致体验** - 深度适配移动端操作，支持侧边栏折叠、卡片式布局自由切换
- **暗色主题支持** - 现代化视觉设计，支持系统主题跟随与手动切换
- **操作日志审计** - 完整记录所有关键操作，支持审计追溯

## 🎯 功能模块

### 仪表盘
- 综合数据概览（班级数、学生数、考试数、参考人次）
- 成绩分布可视化（饼图展示优秀/良好/及格/不及格比例）
- TOP10 优秀学生展示
- 班级进度追踪（已完成/待完成考试）
- 支持班级、考试、科目三级筛选联动

### 班级管理
- 班级列表查看
- 新增/编辑/删除班级
- 班级信息管理（班级名称、所属年级等）

### 学生管理
- 学生列表查看
- 新增/编辑/删除学生
- 学生信息管理（姓名、性别、班级等）
- 查看学生详细档案

### 教学管理

#### 课程管理
- 课程列表管理
- 新增/编辑/删除课程（语文、数学、英语等）

#### 考试管理
- 考试安排管理
- 新增/编辑/删除考试
- 考试信息配置（考试名称、所属班级、考试科目等）

#### 数据导入
- Excel 模板下载
- Excel 文件批量导入成绩
- AI 智能识别成绩单图片
- 导入进度和结果展示

### 成绩清单
- 成绩数据列表展示
- 多维度筛选（班级、考试、科目）
- 学生成绩快速查看
- 成绩数据分析

### 操作日志
- 系统操作审计记录
- 按时间、操作类型筛选
- 操作详情追溯

### 数据分析

#### 班级成绩走势
- 班级各科目平均分趋势图
- 年级班级对比分析（雷达图）
- 成绩分布统计（堆叠柱状图）
- 学生排名分布（气泡图）
- AI 班级学情报告生成

#### 管理预警
- **临界生识别** - 距离及格线或优秀线仅差 1-5 分
- **退步生识别** - 连续考试成绩显著下降
- **波动生识别** - 成绩起伏较大，不稳定
- **偏科生识别** - 学科成绩差异过大
- 针对性改进建议生成

### AI 智能教学

#### 教案生成
- 输入教学基本信息（科目、年级、册次、教学主题）
- 可选关联班级（根据班级学情调整教案难度）
- 流式输出完整教案内容
- 支持根据反馈优化教案
- 教案收藏和管理

#### 作业生成
- 输入作业要求（科目、年级、知识点、难度、题量）
- 智能生成针对性练习题
- 流式输出题目内容
- 支持根据反馈调整题目
- 作业收藏和管理

#### 学生评语
- 在学生档案中一键生成评语
- 基于学生成绩数据智能分析
- 流式输出评语内容
- 展示推理思维过程
- 评语缓存机制（避免重复生成）

#### AI 对话
- 智能教学助手
- 教育相关问题咨询
- 流式对话交互

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
| **React Markdown** | 10.x | Markdown 渲染 |

### 后端
| 技术 | 版本 | 说明 |
|------|------|------|
| **Hono.js** | 4.x | 轻量级 Web 框架（运行在 Cloudflare Workers） |
| **Cloudflare D1** | - | Serverless SQLite 数据库 |
| **Cloudflare KV** | - | 高性能分布式 Key-Value 存储 (用于评语缓存) |
| **AI 模型** | - | DeepSeek-V3.2 (评语/教案/作业) / Qwen3-VL (OCR) |
| **Cloudflare R2** | - | 对象存储（图片/文件） |
| **Zod** | 4.x | 运行时类型校验 |
| **XLSX** | 0.18.x | Excel 文件处理 |
| **JWT** | - | 身份认证 |

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
- **Testing Library** - React 组件测试

## 📦 项目结构

```
bao-class/                      # Monorepo 根目录
├── api/                        # 后端服务 (Cloudflare Workers)
│   ├── src/
│   │   ├── index.ts           # Workers 入口
│   │   ├── routes/            # API 路由
│   │   │   ├── auth.ts        # 认证相关
│   │   │   ├── users.ts       # 用户管理
│   │   │   ├── classes.ts     # 班级管理
│   │   │   ├── students.ts    # 学生管理
│   │   │   ├── courses.ts     # 课程管理
│   │   │   ├── exams.ts       # 考试管理
│   │   │   ├── scores.ts      # 成绩管理
│   │   │   ├── import.ts      # 数据导入
│   │   │   ├── export.ts      # 数据导出
│   │   │   ├── analysis.ts    # 数据分析
│   │   │   ├── ai.ts          # AI 评语生成
│   │   │   ├── ai-chat.ts     # AI 对话
│   │   │   ├── lesson-prep.ts # 教案/作业生成
│   │   │   ├── logs.ts        # 操作日志
│   │   │   ├── stats.ts       # 统计数据
│   │   │   ├── upload.ts      # 文件上传
│   │   │   └── init.ts        # 初始化接口
│   │   ├── services/          # 业务逻辑服务
│   │   │   ├── ai.service.ts        # AI 评语服务
│   │   │   ├── ai-chat.service.ts   # AI 对话服务
│   │   │   ├── analysis.service.ts  # 数据分析服务
│   │   │   └── lesson-prep.service.ts # 教案/作业服务
│   │   ├── middleware/        # 中间件
│   │   │   ├── auth.ts        # 认证中间件
│   │   │   ├── cache.ts       # 缓存中间件
│   │   │   ├── error-handler.ts # 错误处理
│   │   │   ├── logging.ts     # 日志中间件
│   │   │   └── rate-limiter.ts # 限流中间件
│   │   ├── schemas/           # Zod 验证模式
│   │   ├── utils/             # 工具函数
│   │   └── db/                # 数据库
│   │       ├── schema.sql     # 基础表结构
│   │       └── migrations/    # 数据库迁移
│   └── wrangler.toml          # Cloudflare 配置
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   │   ├── ProDashboard.tsx       # 仪表盘
│   │   │   ├── ScoresList.tsx         # 成绩清单
│   │   │   ├── ProScoresList.tsx      # 成绩清单(新)
│   │   │   ├── ClassAnalysis.tsx      # 班级成绩走势
│   │   │   ├── StudentProfile.tsx     # 学生档案
│   │   │   ├── ManagementAlerts.tsx   # 管理预警
│   │   │   ├── Import.tsx             # 数据导入
│   │   │   ├── Classes.tsx            # 班级管理
│   │   │   ├── Students.tsx           # 学生管理
│   │   │   ├── Exams.tsx              # 考试管理
│   │   │   ├── Courses.tsx            # 课程管理
│   │   │   ├── Users.tsx              # 用户管理
│   │   │   ├── AuditLogs.tsx          # 操作日志
│   │   │   ├── LessonPrep.tsx         # 教案生成
│   │   │   ├── HomeworkGenerator.tsx  # 作业生成
│   │   │   └── Login.tsx              # 登录页
│   │   ├── components/        # 公共组件
│   │   │   ├── Charts/              # 图表组件
│   │   │   │   ├── ChartWrapper.tsx
│   │   │   │   ├── ScoreDistributionChart.tsx
│   │   │   │   ├── ScoreTrendChart.tsx
│   │   │   │   ├── StudentRadarChart.tsx
│   │   │   │   ├── SubjectRadarChart.tsx
│   │   │   │   └── ...
│   │   │   ├── Layout/              # 布局组件
│   │   │   ├── Feedback/            # 反馈组件
│   │   │   ├── Guards/              # 路由守卫
│   │   │   ├── ClassAiReportCard.tsx
│   │   │   ├── ExamQualityCard.tsx
│   │   │   └── ...
│   │   ├── hooks/              # 自定义 Hooks
│   │   │   ├── useDashboard.ts
│   │   │   ├── useClassAnalysis.ts
│   │   │   ├── useManagementAlerts.ts
│   │   │   └── ...
│   │   ├── services/           # API 服务
│   │   ├── store/              # 状态管理
│   │   ├── types/              # 类型定义
│   │   ├── utils/              # 工具函数
│   │   └── config/             # 配置文件
│   └── vite.config.ts          # Vite 配置
│
├── packages/                   # 共享包
│   └── types/                  # 共享类型定义
│
├── scripts/                    # 开发脚本
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # 自动部署配置
│
└── package.json                # Monorepo 配置
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

## 📚 功能使用

### 成绩导入

1. 进入「教学管理」→「数据导入」页面
2. **Excel 导入**：下载模板，按格式填写后上传
3. **AI 智能识别**：上传成绩单图片，AI 自动识别成绩并匹配学生

### AI 评语生成

1. 进入「学生管理」或通过仪表盘点击学生
2. 进入学生档案页面
3. 点击「生成 AI 评语」按钮
4. 系统自动分析学生成绩并生成个性化评语（流式输出）

### 教案生成

1. 进入「AI 教学」→「教案生成」页面
2. 选择科目、年级、册次
3. 输入教学内容/主题
4. 可选关联班级（获取班级学情数据）
5. 点击「生成教案」开始 AI 生成
6. 生成完成后可保存、修改、重新生成

### 作业生成

1. 进入「AI 教学」→「作业生成」页面
2. 选择科目、年级
3. 输入知识点/内容
4. 选择难度（基础题/提高题/拓展题）
5. 设置题量
6. 点击「生成作业」开始 AI 生成

### 班级学情分析

1. 进入「数据分析」→「班级成绩走势」页面
2. 选择班级和考试
3. 查看多维度分析图表：
   - 年级班级对比（雷达图）
   - 成绩分布统计（堆叠柱状图）
   - 班级科目趋势（折线图）
   - 学生排名分布（气泡图）
4. 点击「生成 AI 报告」获取深度分析

### 重点关注名单

进入「数据分析」→「管理预警」页面，系统自动识别：

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

   访问 [Actions](https://github.com/Misaka450/bao-class/actions) 查看部署进度

### 手动部署

```bash
# 部署后端
cd api
npm run deploy

# 部署前端（需要先构建）
cd frontend
npm run build
# 然后通过 Cloudflare Pages 连接构建产物
```

## 📄 许可证

本项目仅供学习和个人使用。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
