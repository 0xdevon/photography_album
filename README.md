# Unsplash Photography Portfolio V3.1 (Cloudflare Pages)

[中文](#中文) | [English](#english)

## 中文

极简版在线摄影作品集 Cloudflare Pages 版本。

### 特点

- 前端 `script.js` 不再包含 Unsplash API Key
- 使用 Cloudflare Pages Functions 作为代理层
- Unsplash Key 存在 Cloudflare Pages Secret 中
- 前端只请求：
  - `/api/profile`
  - `/api/photos`
  - `/api/photo/:id`

### 项目结构

```text
.
├─ index.html
├─ style.css
├─ script.js
├─ functions/
│  └─ api/
│     ├─ profile.js
│     ├─ photos.js
│     └─ photo/
│        └─ [id].js
├─ wrangler.toml
└─ .gitignore
```

### 你需要改的唯一前端配置

编辑 `script.js`：

```js
const username = "YOUR_UNSPLASH_USERNAME";
```

只保留用户名，不再需要写 access key。

### Cloudflare Pages 部署步骤

#### 1. 上传到 Git 仓库
把整个项目上传到 GitHub / GitLab。

#### 2. 创建 Cloudflare Pages 项目
在 Cloudflare Pages 里连接你的 Git 仓库。

#### 3. 构建设置
这是静态站 + Functions 项目，通常无需额外 build 命令。

- Build command: 留空
- Build output directory: `.`

#### 4. 添加 Secret
在 Cloudflare Pages 项目设置中添加：

- `UNSPLASH_ACCESS_KEY=你的 Unsplash Access Key`

#### 5. 重新部署
保存后重新部署即可。

### 本地开发（可选）

如果你安装了 Wrangler，可以本地预览：

```bash
npm install -g wrangler
wrangler pages dev .
```

本地如果要测试 secret，可使用 `.dev.vars`，例如：

```bash
UNSPLASH_ACCESS_KEY=your_real_access_key
```

注意：不要把 `.dev.vars` 提交到 Git。

## English

A minimal online photography portfolio for Cloudflare Pages.

### Features

- The frontend `script.js` no longer contains the Unsplash API key.
- Cloudflare Pages Functions serve as the API proxy layer.
- The Unsplash key is stored as a Cloudflare Pages secret.
- The frontend only requests:
  - `/api/profile`
  - `/api/photos`
  - `/api/photo/:id`

### Project Structure

```text
.
├─ index.html
├─ style.css
├─ script.js
├─ functions/
│  └─ api/
│     ├─ profile.js
│     ├─ photos.js
│     └─ photo/
│        └─ [id].js
├─ wrangler.toml
└─ .gitignore
```

### The Only Frontend Setting You Need to Change

Edit `script.js`:

```js
const username = "YOUR_UNSPLASH_USERNAME";
```

Only the username is needed; you no longer need to include an access key in the frontend.

### Deploying to Cloudflare Pages

#### 1. Push to a Git Repository

Push the entire project to GitHub or GitLab.

#### 2. Create a Cloudflare Pages Project

Connect your Git repository in Cloudflare Pages.

#### 3. Configure Build Settings

This project consists of a static site and Functions, so an additional build command is usually unnecessary.

- Build command: leave blank
- Build output directory: `.`

#### 4. Add a Secret

Add the following secret in your Cloudflare Pages project settings:

- `UNSPLASH_ACCESS_KEY=your_unsplash_access_key`

#### 5. Redeploy

Save the settings and redeploy the project.

### Local Development (Optional)

Use Wrangler to preview the project locally:

```bash
npm install -g wrangler
wrangler pages dev .
```

To test with a secret locally, create a `.dev.vars` file, for example:

```bash
UNSPLASH_ACCESS_KEY=your_real_access_key
```

Do not commit `.dev.vars` to Git.
