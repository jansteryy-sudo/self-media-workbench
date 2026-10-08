# 个人 AI 工作台

一个以项目为中心、数据保存在 Mac 本机的工作空间。整理任务和输入资料，带着上下文使用 AI，再把结果保存为项目产物。

## 快速开始

需要 Node.js 22 和 npm。无需 Docker 或云数据库。

```bash
npm ci
npm run db:init -- --demo
npm run dev
```

打开 http://127.0.0.1:3210 。也可以双击 `启动工作台.command`。示例数据仅在空数据库、明确传入 `--demo` 时写入，不会覆盖已有数据。不想要示例时使用 `npm run db:init`。

正式运行：

```bash
npm run build
npm start
```

默认只监听 `127.0.0.1`。不应将本项目直接暴露到公网；当前版本没有多用户认证。

## 已实现

- 工作台首页：最近项目、AI 入口、产物和真实使用记录。
- 项目创建、编辑、归档、恢复；颜色、图标、标签、当前目标与自动保存的 Markdown 笔记。
- 任务创建、编辑、状态、优先级、关联项目、AI 偏好；右侧详情抽屉。
- 资料上传、下载和安全格式预览；粘贴结果、链接、附件保存为产物，保留项目、任务、来源应用、指令和 AI 记录关联。
- Context Builder：逐项选择项目背景、目标、笔记、任务、最近产物、文件清单，预览后复制或发送。
- ChatGPT / DeepSeek / 千问 / Lovart / 即梦网页入口；先复制，再点击明确的官网链接，避免异步打开窗口被浏览器拦截。
- DeepSeek / 千问官方 OpenAI-compatible Chat Completions Adapter，服务端请求；内部 Markdown 对话、复制、保存到项目、历史会话恢复。
- 标准 MCP Streamable HTTP / SSE 适配器：连接测试、工具发现、显式工具名称与 JSON 参数映射、文本调用、本地会话保存。需要实际 MCP Server。
- ⌘K / Ctrl+K 搜索项目、任务、产物、文件和快捷命令。
- 浅色 / 深色 / 跟随系统、侧栏折叠、窄屏布局、空状态、错误与重试。

本版本使用 Next.js + TypeScript + React、Lucide、react-markdown、Zod、SQLite + Drizzle。样式采用独立 CSS 变量，不依赖 UI 组件框架。

## AI 连接配置

| 应用 | 目前支持 | 配置方法 |
| --- | --- | --- |
| ChatGPT | External | 设置里可修改官网入口；不读取会员接口、Cookie 或网页 DOM |
| DeepSeek | External + REST API | 服务端 `DEEPSEEK_API_KEY`；设置里 Base URL、Model、测试连接 |
| 千问 | External + REST API | 服务端 `QWEN_API_KEY`；Base URL 需与密钥地区一致 |
| Lovart | External | 官网使用；创作 API 暂未启用 |
| 即梦 | External | 官网使用；Seedance API 暂未启用 |
| OpenClaw | 标准 MCP 桥接 | 真实 MCP 地址、Transport、工具名与参数模板；可选 `OPENCLAW_MCP_TOKEN` |

### API 密钥

```bash
cp .env.example .env.local
chmod 600 .env.local
```

在 `.env.local` 填写自己的 Key，重启服务。已有进程环境里的同名变量也会生效。密钥不进入数据库、浏览器或客户端 bundle，连接状态只显示是否配置。UI 暂不提供 Keychain 写入，符合开发期环境文件方案。切勿把 `.env.local` 上传或分享。

DeepSeek 默认 `https://api.deepseek.com` / `deepseek-chat`，千问默认北京地区兼容入口 `https://dashscope.aliyuncs.com/compatible-mode/v1` / `qwen-plus`。实际可用模型以自己的服务账号为准。设置页先保存，再测试。API 调用使用独立额度，不与网页会员额度互通。

### OpenClaw 的协议边界

OpenClaw 官方 Gateway 是 WebSocket 控制协议；“OpenClaw 可连接 MCP 服务”不代表它天然提供了一个可供外部调用的 MCP Server。本版不猜测网关接口，不假造 `send_message` 工具。

若已部署兼容的 MCP 桥接服务：

1. 设置 → OpenClaw，填写其 MCP URL 和 transport，保存。
2. 测试连接，查看真实 `tools/list` 返回的工具及 inputSchema。
3. 填入用于消息交互的工具名，并按服务端字段写 JSON 参数模板。
4. 模板中 `{{message}}`、`{{context}}`、`{{sessionId}}` 会递归替换，保留 JSON 类型与转义。
5. 从项目选择 OpenClaw，进入内部工作区发送消息。

每次调用重新连接，断线后可重试。本地 session ID 可传给桥接；远端会话复用由桥接支持决定。暂不推断附件与远端新会话工具，因此不显示未支持的附件按钮。没有 MCP Server 时仅能展示“待配置”，不能宣称原生 OpenClaw 往返验收完成。

### 文档依据

- [DeepSeek 官方首次调用](https://api-docs.deepseek.com/)
- [千问官方 API 文档](https://help.aliyun.com/zh/model-studio/qwen-api-reference/)
- [OpenClaw Gateway 协议](https://docs.openclaw.ai/gateway/protocol)
- [OpenClaw 连接 MCP 服务](https://docs.openclaw.ai/tools/mcp)

## 数据与备份

默认结构：

```text
workbench-data/
  workbench.db
  workbench.db-wal / workbench.db-shm   # SQLite 运行时文件
  projects/<project-id>/files/<file-id>
```

产物文字、URL 与来源信息存在 `assets` 表；产物附件复用统一文件目录，以 `fileId` 关联，不重复存储。

停止服务后复制整个 `workbench-data` 文件夹即可备份。不能在服务运行时只拷贝 `.db` 而忽略 WAL。可通过 `WORKBENCH_DATA_DIR` 设置绝对路径，然后重启；更改路径不会自动搬迁旧数据。

SQL migration 放在 `migrations/`，数据库初始化和服务启动按文件名顺序执行未应用的迁移，结果记录在 `schema_migrations`。Drizzle schema 在 `src/db/schema.ts`，两者需一起更新。恢复备份后自动迁移。

`.gitignore` 排除了 `.env*`（除了空模板）、数据库、文件、缓存与构建输出。文件使用 UUID 存储名，原始名称保留为元数据；活动内容格式一律下载而非同源内嵌，常见图片、音视频、PDF 与纯文本可预览。

## 验证

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

测试使用独立临时数据目录，不改变工作台项目。API 适配器测试采用明确隔离的测试响应，真实 Provider 验证需凭证；请区分测试适配器通过和官方服务验收。

## 已知限制

- Lovart / Seedance 创作 API 暂未提供；没有接口文档与凭证时不会生成假任务 ID 或假结果。
- 标准 MCP Adapter 可用不等于 OpenClaw 原生已连接，需要用户环境中的桥接服务完成真实往返验收。
- 文件最大 100 MB；上传需在服务内存中缓冲。本版不解析 DOCX/PDF 内容，Context Builder 的 Files 仅携带清单；External 请自行附加文件。
- 网页 AI 无法自动取回结果，需手动粘贴、上传或记录链接。记录为“上下文已准备”，不代表官网对话完成。
- 搜索是本机普通文本匹配；当前单用户数据一次加载，未做大规模分页或语义检索。
- 不做公网部署、多设备同步、团队权限、自动路由与 Agent 编排。
- 字体优先使用 Google Fonts 的 DM Sans / Noto Sans SC；网络不可用时自动使用本机字体，业务功能不依赖外部字体。
- 连接测试会发起一次最小真实 API 请求；可能消耗少量独立 API 额度。
