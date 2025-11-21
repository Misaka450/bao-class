# GitHub Actions 自动部署配置

本项目已配置 GitHub Actions，实现推送到 master 分支后自动部署到 Cloudflare。

## 部署流程

当你推送代码到 `master` 分支时，GitHub Actions 会自动：

1. **部署后端 Worker**
   - 安装依赖
   - 使用 `wrangler deploy` 部署到 Cloudflare Workers
   - 部署到 `https://api.980823.xyz/`

2. **部署前端 Pages**
   - 安装依赖
   - 构建前端（`npm run build`）
   - 部署到 Cloudflare Pages

## 配置步骤

### 1. 设置 GitHub Secrets

在你的 GitHub 仓库中，需要配置以下 Secrets：

1. **CLOUDFLARE_API_TOKEN**
   - 获取方式：登录 Cloudflare Dashboard → My Profile → API Tokens → Create Token
   - 权限：需要 `Workers Scripts:Edit` 和 `Cloudflare Pages:Edit` 权限
   - 你已有的 token: `Jm0EQLSgX_ScIPW0ly2AoUNng6EI4zLm-pMridnv`

2. **CLOUDFLARE_ACCOUNT_ID**
   - 获取方式：Cloudflare Dashboard 右侧栏可以看到
   - 你的 Account ID: `02cefa4c2401a3f9c36ef7c6dbf5ce39`

### 2. 在 GitHub 中添加 Secrets

1. 访问你的 GitHub 仓库：`https://github.com/Misaka450/bao-class`
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加以下两个 secrets：
   - Name: `CLOUDFLARE_API_TOKEN`, Value: `Jm0EQLSgX_ScIPW0ly2AoUNng6EI4zLm-pMridnv`
   - Name: `CLOUDFLARE_ACCOUNT_ID`, Value: `02cefa4c2401a3f9c36ef7c6dbf5ce39`

### 3. 创建 Cloudflare Pages 项目（如果还没有）

1. 访问 Cloudflare Dashboard → Pages
2. 创建新项目，项目名称：`bao-class`
3. 或者，首次推送时 GitHub Actions 会自动创建

## GitHub Actions Workflow 文件

配置文件位于：`.github/workflows/deploy.yml`

该文件定义了两个 Job：
- `deploy-worker`: 部署后端到 Cloudflare Workers
- `deploy-pages`: 部署前端到 Cloudflare Pages

## 手动触发部署

除了自动触发，你也可以手动触发部署：

1. 访问 GitHub 仓库的 **Actions** 标签
2. 选择 **Deploy to Cloudflare** workflow
3. 点击 **Run workflow** 按钮

## 查看部署状态

1. 访问 GitHub 仓库的 **Actions** 标签
2. 查看最新的 workflow 运行记录
3. 点击查看详细日志

## 注意事项

- 确保 `wrangler.toml` 中的配置正确
- 确保前端构建命令 `npm run build` 可以正常运行
- Cloudflare Pages 项目名称必须是 `bao-class`（与 workflow 中配置一致）
