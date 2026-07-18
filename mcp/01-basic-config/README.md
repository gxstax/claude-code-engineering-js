# 01 Basic Config — MCP 服务器配置模板

本目录提供了 Claude Code MCP 服务器的配置示例，开箱即用。

## 前置准备

- [Node.js](https://nodejs.org/) >= 18
- [uvx](https://docs.astral.sh/uv/)（用于 `fetch` 服务器）

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 填入你的 API Key：

| 变量 | 用途 | 获取地址 |
|------|------|---------|
| `GITHUB_TOKEN` | GitHub API | https://github.com/settings/tokens |
| `NOTION_API_KEY` | Notion API | https://www.notion.so/my-integrations |
| `DATABASE_URL` | 数据库连接 | 自建或云数据库 |

### 2. 启用 MCP 服务器

将 `.mcp.json` 中的配置合并到 `~/.claude/settings.json` 的 `mcpServers` 字段中，或者直接放在项目根目录下（Claude Code 会自动加载）。

### 3. 验证连接

在 Claude Code 中运行：

```bash
claude mcp list
```

应该能看到所有已配置的服务器及其状态（已连接 / 错误）。

## 服务器列表

| 服务器 | 工具 | 用途 |
|--------|------|------|
| context7 | 上下文注入 | 为对话附加长尾知识库 |
| filesystem | 文件读写 | 读写、搜索、目录遍历 |
| fetch | HTTP 请求 | 抓取网页内容 |
| memory | 持久记忆 | 跨会话存储关键信息 |
| github | GitHub API | 管理 Issue、PR、代码审查 |
| notion | Notion 集成 | 读写数据库和页面 |
| database | MySQL 查询 | 执行 SQL 查询 |

> **注意**：`.env` 包含敏感凭据，切勿提交到版本控制。
