# 史航菲 · 个人主页

一个简洁的四屏式个人主页，包含**个人信息展示**、**学习记录时间线**，以及两个 AI 小工具——**一键去除图片背景** 和 **文字生成图片**。

## 功能一览

| 屏幕 | 内容 |
| --- | --- |
| 第一屏 · 关于我 | 圆形头像、昵称、一句话介绍、兴趣爱好标签、学习目标；右上角固定显示**北京实时天气**（Open-Meteo 免费接口，无需 Key） |
| 第二屏 · 我的学习记录 | 时间线形式记录学习里程碑（爬虫抓取 → 第一个个人网页 → 第一次 API 调用 → 一键去除图片背景 → 文字生成图片） |
| 第三屏 · 一键去除图片背景 | 拖拽/点击上传图片 → AI 抠图 → 原图与结果左右对比 → 结果可下载 |
| 第四屏 · 文字生成图片 | **谷歌极简风格**：输入提示词 → 选择画面比例 → AI 出图 → 结果可下载 |

## 技术栈

- **前端**：单文件 `index.html`，原生 HTML + CSS + JavaScript，无任何框架依赖
- **后端**：Node.js + Express
- **抠图能力**：[Replicate](https://replicate.com/) 上的 [`lucataco/remove-bg`](https://replicate.com/lucataco/remove-bg) 模型
- **文生图能力**：[OpenRouter](https://openrouter.ai/) 上的 [`openai/gpt-5.4-image-2`](https://openrouter.ai/openai/gpt-5.4-image-2/api) 模型（OpenAI 兼容接口）
- **天气数据**：[Open-Meteo](https://open-meteo.com/) 免费接口

## 目录结构

```
WB网页制作/
├── index.html          # 全部前端页面（四屏合一）
├── server.js           # Express 后端：静态托管 + 抠图接口 + 文生图接口
├── package.json        # 依赖清单
├── 启动.bat            # Windows 一键启动脚本
├── .env.example        # 环境变量模板（可选，推荐用系统环境变量）
├── .gitignore          # 忽略 node_modules 和 .env
├── README.md           # 本文档
└── 史航菲2寸.jpg        # 头像图片
```

## 快速开始

### 1. 安装依赖

需要 Node.js 18 或更高版本。

```bash
npm install
```

### 2. 获取两个密钥

本项目用到两个第三方服务，各自需要一个密钥：

**① Replicate Token —— 用于「一键去除图片背景」**

1. 注册并登录 [Replicate](https://replicate.com/)（可用 GitHub 账号登录）
2. 打开 [API Tokens 页面](https://replicate.com/account/api-tokens)
3. 点击 **Create token**，复制生成的 Token（形如 `r8_xxxxxx...`）

> Replicate 按次计费，新账号通常自带少量免费额度，抠图模型单次约 $0.001～0.005。

**② OpenRouter Key —— 用于「文字生成图片」**

1. 注册并登录 [OpenRouter](https://openrouter.ai/)（可用 Google / GitHub 账号登录）
2. 打开 [Keys 页面](https://openrouter.ai/settings/keys)
3. 点击 **Create Key**，复制生成的 Key（形如 `sk-or-v1-xxxxxx...`）
4. 到 [Credits 页面](https://openrouter.ai/settings/credits) 充值（文生图模型按次计费）

> 只做抠图、不做文生图的话，可以跳过第 ② 步，服务依然能正常启动，只是第四屏会提示未配置。

### 3. 配置环境变量（推荐做法）

密钥**只通过系统环境变量**提供，不写进任何代码文件，也不落在项目目录里。

**Windows**（在 PowerShell 或 CMD 中执行，注意需要重开终端才生效）：

```powershell
setx REPLICATE_API_TOKEN "你的Replicate Token"
setx OPENROUTER_API_KEY "你的OpenRouter Key"
```

执行后**关闭当前终端重新打开**，再启动服务。验证是否生效：

```powershell
echo $env:REPLICATE_API_TOKEN
echo $env:OPENROUTER_API_KEY
```

**macOS / Linux**：

```bash
echo 'export REPLICATE_API_TOKEN="你的Replicate Token"' >> ~/.bashrc
echo 'export OPENROUTER_API_KEY="你的OpenRouter Key"'   >> ~/.bashrc
source ~/.bashrc
```

**其他环境**：在部署平台的「环境变量」设置中添加这两个变量，例如
Docker 用 `docker run -e REPLICATE_API_TOKEN=... -e OPENROUTER_API_KEY=...`。

> ✅ **安全说明**
> - 代码里只出现 `process.env.XXX`，**没有任何硬编码的密钥**
> - 启动日志只打印「已读取」，**不会打印密钥本身**
> - 前端完全不接触密钥：浏览器只请求自己的后端接口
> - 环境变量属于操作系统 / 部署平台配置，不会进入 Git 仓库

**可选变量**：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OPENROUTER_IMAGE_MODEL` | `openai/gpt-5.4-image-2` | 换文生图模型，无需改代码 |
| `OPENROUTER_TIMEOUT_MS` | `180000` | 文生图超时毫秒数 |
| `PORT` | `3000` | 服务端口 |

**备选做法（不想动系统环境变量时）**：在项目根目录放一个 `.env` 文件，它已被 `.gitignore` 排除，不会提交到 Git：

```bash
cp .env.example .env   # 然后编辑 .env 填入密钥
```

> `.env` 的优先级低于真实环境变量：两者同时存在时，系统环境变量生效。

### 4. 启动服务

```bash
npm start
```

看到下面的输出就说明成功了：

```
  ✅ 个人主页已启动
  🌐 打开浏览器访问：http://localhost:3000
  🔑 REPLICATE_API_TOKEN：已从环境变量读取（抠图）
  🎨 OPENROUTER_API_KEY：已从环境变量读取（文生图模型：openai/gpt-5.4-image-2）
```

在浏览器打开 <http://localhost:3000> 即可。

开发时可以用 `npm run dev`，修改 `server.js` 后自动重启。

## 使用说明

### 去除图片背景

1. 滚动到第三屏
2. 把图片**拖进虚线框**，或**点击虚线框**选择图片（支持 JPG / PNG / WebP，10MB 以内）
3. 点击「去除背景」按钮
4. 按钮会变灰并显示「处理中…」，通常 5～20 秒完成
5. 完成后右侧显示抠好图的结果（透明区域用棋盘格标示），点击「下载结果图片」保存 PNG

### 文字生成图片

1. 滚动到第四屏（谷歌极简风格页面）
2. 在输入框里**描述你想要的画面**，越具体效果越好
   - 可包含：主体 + 场景 + 风格 + 光线，例如
     「一只戴宇航头盔的橘猫漂浮在星空中，紫色星云背景，写实风格，柔和侧光」
3. 选择**画面比例**（1:1 / 16:9 / 9:16 / 4:3）
4. 点击「生成图片」（也可以按 `Ctrl + Enter` 快捷生成）
5. 按钮会变灰并显示「处理中…」，画面区域显示进度条
6. 完成后图片显示在下方，点击「下载图片」保存，或点「再生成一张」重画

> ⏱️ 该模型出图较慢，P50 延迟约 76 秒，页面提示为「30～90 秒」属正常现象。
> 想更快可以换用 `google/gemini-2.5-flash-image` 等模型（见下方环境变量说明）。

### 换天气城市

打开 `index.html`，找到天气脚本顶部的 `WEATHER_LOCATION`，修改经纬度和名称：

```javascript
const WEATHER_LOCATION = { name: "北京", latitude: 39.9042, longitude: 116.4074 };
// 上海：{ name: "上海", latitude: 31.2304, longitude: 121.4737 }
// 广州：{ name: "广州", latitude: 23.1291, longitude: 113.2644 }
```

### 换配色

打开 `index.html`，修改顶部 `:root` 里的 CSS 变量即可全站生效：

```css
:root {
  --primary: #5b7cfa;   /* 主色 */
  --bg: #f6f8fc;        /* 页面背景色 */
  /* ... 其余变量见文件内注释 */
}
```

### 增加学习记录

在 `index.html` 的 `<ul class="timeline">` 中，复制任意一个 `<li>...</li>` 块粘贴到最前面，修改日期、标题和描述即可。

## 接口说明

### `POST /api/remove-bg`

去除上传图片的背景。

**请求**（`multipart/form-data`）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `image` | File | 要处理的图片，≤ 10MB |

**成功响应** `200`

```json
{
  "ok": true,
  "image": "https://replicate.delivery/pbxt/xxxx/out.png"
}
```

**失败响应**

```json
{ "error": "错误原因说明" }
```

常见错误：

| 状态码 | 含义 | 处理方法 |
| --- | --- | --- |
| 400 | 没有收到图片 / 图片超过 10MB | 重新选择一张更小的图片 |
| 401 | Replicate Token 无效或过期 | 重新生成 Token 并更新环境变量 |
| 402 | Replicate 账户余额不足 | 到 Replicate 控制台充值 |
| 429 | 请求过于频繁 | 稍等片刻后重试 |
| 500 | 服务端其他错误 | 查看终端日志中的 `[抠图]` 输出 |

### `POST /api/generate-image`

根据文字提示词生成图片。

**请求**（`application/json`）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `prompt` | String | 是 | 图片描述，≤ 2000 字符 |
| `aspect` | String | 否 | 画面比例，默认 `1:1`。可选 `1:1` / `16:9` / `9:16` / `4:3` |

请求示例：

```bash
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt":"一只戴宇航头盔的橘猫漂浮在星空中","aspect":"16:9"}'
```

**成功响应** `200`

```json
{
  "ok": true,
  "model": "openai/gpt-5.4-image-2",
  "image": "data:image/png;base64,iVBORw0KGgo...",
  "text": "模型附带返回的文字说明",
  "usage": { "prompt_tokens": 24, "completion_tokens": 1032, "total_tokens": 1056 }
}
```

> `image` 是 **base64 data URL**（OpenRouter 的出图模型都这样返回），
> 前端可以直接放进 `<img src>`，也能直接作为下载链接，无需再请求一次网络。

**失败响应**

```json
{ "error": "给用户看的友好提示", "detail": "接口返回的原始信息" }
```

常见错误：

| 状态码 | 含义 | 处理方法 |
| --- | --- | --- |
| 400 | 提示词为空 / 超过 2000 字符 | 修改提示词后重试 |
| 402 | OpenRouter 余额不足 | 到 [Credits](https://openrouter.ai/settings/credits) 充值 |
| 429 | 请求过于频繁 | 稍等片刻后重试 |
| 500 | 密钥无效，或**模型被地区限制** | 见下方常见问题 |
| 502 | 模型只返回文字、没出图 | 换个说法或换模型重试 |
| 504 | 超时（默认 180 秒） | 稍后重试，或换更快的模型 |

## 常见问题

**Q：点击「去除背景」后提示"服务端未读取到环境变量 REPLICATE_API_TOKEN"？**
A：按顺序检查：
1. 是否执行过 `setx REPLICATE_API_TOKEN "你的Token"`（或对应系统的设置方式）
2. **是否重开了终端**——`setx` 只对之后新开的终端生效，旧终端读不到
3. 在终端执行 `echo $env:REPLICATE_API_TOKEN` 确认能打印出值（PowerShell）或 `echo $REPLICATE_API_TOKEN`（bash）
4. 确认后重启服务，环境变量只在启动时读取一次

**Q：文生图提示"当前网络所在地区无法访问该模型"？**
A：这是 **OpenRouter 对图像生成模型的地理围栏限制**，与你的密钥和余额无关。
OpenRouter 会对部分出图模型按请求来源地区做限制，中国大陆直连通常会被拦下，
接口返回的原始错误是：

```json
{
  "error": { "message": "This model is not available in your region.", "code": 403,
    "metadata": { "failed_routing_step": "Gate Endpoints with Geo Restrictions" } }
}
```

**验证你的密钥是否正常**（能返回账户信息就说明密钥没问题）：

```bash
curl https://openrouter.ai/api/v1/key -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

**可选的解决方向**：
- 更换网络出口（使用部署在境外的服务器运行本项目），或配置可用的代理
- 换用其他出图模型试试，环境变量 `OPENROUTER_IMAGE_MODEL` 可直接切换，无需改代码：

```powershell
setx OPENROUTER_IMAGE_MODEL "google/gemini-2.5-flash-image"
```

> 环境变量只在服务启动时读取，改完记得**重开终端**并重启服务。

**Q：生成一张图要等很久？**
A：`openai/gpt-5.4-image-2` 的 P50 延迟约 76 秒（用了 GPT-5.4 做推理再出图）。
页面提示 30～90 秒属正常范围。想更快可以换 `google/gemini-2.5-flash-image`。
超时上限可用 `OPENROUTER_TIMEOUT_MS` 调整（默认 180000，即 180 秒）。

**Q：提示"Replicate 账户余额不足"？**
A：Replicate 需要绑定支付方式，登录后在 [Billing](https://replicate.com/account/billing) 页面充值即可。

**Q：处理很久没反应？**
A：模型首次调用需要冷启动，可能需要 20～40 秒。之后会快很多。如果超过 1 分钟仍无响应，检查终端日志。

**Q：结果图片显示不出来？**
A：Replicate 返回的图片链接有有效期（约 1 小时）。建议处理完立刻点「下载结果图片」保存到本地。

**Q：为什么前端拿不到结果 URL 就直接显示了？**
A：前端不直接调用 Replicate，而是发给自己的后端。密钥保存在服务端，浏览器里看不到，这样更安全。

**Q：上传的图片会被保存吗？**
A：不会。后端使用内存存储（`multer.memoryStorage()`），图片只存在于处理过程中的内存里，不会写入磁盘。

**Q：第四屏的图会存在服务器上吗？**
A：不会。OpenRouter 以 base64 data URL 返回图片，后端直接转发给前端，不会写任何文件到磁盘。
另外因为图片是内嵌数据而非外链，所以不存在「链接过期」的问题。

## 部署提示

部署到服务器时，**不要在代码里硬编码密钥**，应通过平台的环境变量配置功能设置：

- Vercel / Railway / Render：在项目的 Environment Variables 设置中添加
- Docker：`docker run -e REPLICATE_API_TOKEN=... -e OPENROUTER_API_KEY=... ...`
- 宝塔 / 云服务器：`setx` 或写入 shell 配置，也可用 PM2 的 `ecosystem.config.js` 配置 `env`

> 💡 如果只用到文生图、遇到地区限制，把项目部署到境外服务器上运行是最省事的办法。

## 安全清单

- [x] 代码中**没有**硬编码密钥，只使用 `process.env.REPLICATE_API_TOKEN` / `process.env.OPENROUTER_API_KEY`
- [x] 项目目录里**没有** `.env` 文件，密钥只存在于系统环境变量中
- [x] 前端页面**不接触**密钥，所有第三方调用都在后端完成
- [x] 启动日志与错误信息**不打印**密钥内容
- [x] `.gitignore` 已排除 `.env`，避免误提交
- [x] 上传的图片存内存、不落盘；生成的图片不写磁盘
- [x] 后端对请求做了参数校验（提示词非空、长度 ≤ 2000、文件 ≤ 10MB）

> 如果密钥曾经出现在聊天记录、截图或公开仓库中，建议立即到对应后台删除并重新生成：
> - Replicate：[API Tokens](https://replicate.com/account/api-tokens)
> - OpenRouter：[Keys](https://openrouter.ai/settings/keys)
>
> 生成新密钥后，用 `setx` 更新环境变量即可，代码无需任何改动。

## License

MIT
