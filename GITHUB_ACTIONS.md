# GitHub Actions 自动部署配置说明

## 📋 配置步骤

### 1. 获取 Cloudflare API Token

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 "Create Token"
3. 选择 "Edit Cloudflare Workers" 模板
4. 或者使用自定义 Token，需要以下权限：
   - **Account** → Workers Scripts → Edit
   - **Account** → Cloudflare Pages → Edit
   - **Account** → D1 → Edit
5. 复制生成的 API Token

### 2. 获取 Account ID

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的账户
3. 右侧边栏可以看到 **Account ID**
4. 复制 Account ID

### 3. 在 GitHub 仓库配置 Secrets

1. 打开你的 GitHub 仓库
2. 进入 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加以下两个 secrets：

   **Secret 1:**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: 粘贴你的 Cloudflare API Token

   **Secret 2:**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: 粘贴你的 Cloudflare Account ID

### 4. 验证配置

配置完成后，每次向 `master` 分支推送代码时：

1. GitHub Actions 会自动触发
2. 先部署后端到 Cloudflare Workers
3. 然后构建并部署前端到 Cloudflare Pages

你可以在仓库的 **Actions** 标签页查看部署进度和日志。

## 🔍 故障排查

### 如果部署失败：

1. **检查 Secrets 是否正确配置**
   - 确保 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 都已添加
   - 确保 Token 有正确的权限

2. **查看 Actions 日志**
   - 进入 GitHub 仓库的 **Actions** 标签
   - 点击失败的 workflow
   - 查看详细错误信息

3. **验证 Cloudflare 项目配置**
   - 确保 Workers 名称和 wrangler.toml 配置一致
   - 确保 Pages 项目名称为 `bao-class`

## 📝 Workflow 说明

当前配置的 workflow 会：
- ✅ 自动安装依赖
- ✅ 部署后端 API 到 Cloudflare Workers
- ✅ 构建前端项目
- ✅ 部署前端到 Cloudflare Pages

所有这些步骤都在一次 push 后自动完成！
