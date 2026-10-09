# 小鱼自媒体工作台

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

本地优先的自媒体运营桌面应用，面向小红书、抖音、微信公众号等多账号运营。当前提供 Apple Silicon Mac 测试版，macOS 13 或更高版本。

## 下载安装

[下载最新版 Mac 安装包](https://github.com/jansteryy-sudo/self-media-workbench/releases/latest) · [直接下载 v0.2.3 DMG](https://github.com/jansteryy-sudo/self-media-workbench/releases/download/v0.2.3/SelfMediaWorkbench-0.2.3-mac-arm64.dmg)

适用于 M 系列 Mac、macOS 13 及以上。打开 DMG 后将 App 拖入 Applications。当前为尚未完成 Apple 正式签名与公证的测试版，详细限制及操作见 [安装说明](docs/MAC安装说明.md)。

## 功能

- 按账号管理灵感、调研、选题、内容制作、审核、发布计划和数据复盘。
- 发布资产、商品与赠品、知识与经验管理。
- 手动处理与 Skill 自动化配置、全局 AI 助手、模型 API 连接。
- 对外提供 MCP 接口，供 AI 工具或 Agent 读取和写入授权内容。
- 多种主题、列表与日历视图、本地备份与恢复。

社交媒体发布由使用者手动完成。模型、Skill、MCP 和隧道需要使用者自行配置；安装后不代表外部服务已连接。

## 开发运行

需要 Node.js 22 和 npm。

```bash
npm ci
npm run dev
```

打开 http://127.0.0.1:3210/studio 。默认数据目录为 `workbench-data/`，可通过 `WORKBENCH_DATA_DIR` 指定独立目录。首次使用自行添加运营账号。

## 打包 Mac 应用

在 Apple Silicon Mac 上执行：

```bash
npm ci
npm run package:mac
```

安装包输出至 `dist/`，包含独立运行环境，无需用户安装 Node.js。当前使用临时签名，正式对外分发仍需 Apple Developer ID 签名和公证。安装步骤见 [Mac 安装说明](docs/MAC安装说明.md)。

## 数据边界

仓库和安装包不包含使用者的账号信息、素材、Skill、API 密钥、MCP 凭证、隧道配置或运行数据库。`.env.example` 仅包含空配置模板。

桌面应用的数据保存在 `~/Library/Application Support/SelfMediaWorkbench/`，独立于安装包。桌面版 API 密钥加密保存，主密钥由 macOS 钥匙串保护。MCP 默认关闭。当前没有多用户账号体系，不应直接把工作台服务暴露到公网。

## 检查

```bash
npm run lint
npm test
npm run build
```

测试通过不等于真实模型、隧道或第三方平台已验收。已做本机独立安装包启动验证，尚未在另一台实体 Mac 上验收。

## 代码结构

- `src/components/creator-demo/`：当前运营工作台界面。
- `src/app/api/studio/`：运营数据、模型、Skill 和 MCP 接口。
- `desktop/`、`scripts/package-mac.cjs`：桌面入口和打包流程。
- `tests/`：行为与密钥存储测试。
- `public/themes/`：主题视觉资源。

历史项目工作台代码保留在仓库内，其原有说明见 [历史开发说明](docs/LEGACY_WORKBENCH.md)，不代表当前桌面版配置方式。

## 开源许可

本项目采用 [MIT License](LICENSE) 开源。除另有许可声明的第三方内容外，仓库中的项目代码、文档及随附项目资源均按此许可证提供。

任何人都可以免费下载、使用、复制、修改、二次开发、再分发和商用，无需另行申请授权。你可以只在本地使用自己的修改版，也可以发布自己的版本；不要求公开修改后的源代码，也不要求将改动贡献回本项目。分发时请保留 MIT 许可证中的版权与许可声明。

第三方依赖及资源仍遵循各自的许可证，本项目的 MIT 许可不替代这些许可。软件按现状提供，不附带任何保证。欢迎通过 Issue 反馈问题，或通过 Pull Request 分享改进。
