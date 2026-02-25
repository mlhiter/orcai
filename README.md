# ORCAI MVP

ORCAI 是一个知识点到结构化教程的生成平台 MVP。

## 功能

- 输入知识点，生成结构化教程
- 同知识点复用已有教程版本
- 支持手动刷新，创建新版本
- 生成流程内部使用 Web 搜索 + LLM 进行 grounding（首版不展示引用）

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

如果你使用 OpenAI 兼容的第三方服务，请设置：

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`（例如 `https://your-provider.example/v1`）

3. 准备数据库（PostgreSQL）并推送 schema

```bash
npm run prisma:generate
npm run prisma:push
```

你本机已有历史 Postgres 容器记录（示例）：

- `jotlin-postgres`: `localhost:5432`（`jotlin/jotlin_dev_password`, DB `jotlin_db`）
- `doro-postgres`: `localhost:5433`（`postgres/postgres`, DB `doro`）
- `tarot-postgres`: `localhost:5434`（`postgres/postgres`, DB `tarot`）

将 `.env` 中 `DATABASE_URL` 改成对应连接即可，例如：

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/tarot?schema=public"
```

4. 启动开发环境

```bash
npm run dev
```

访问 `http://localhost:3000`

## 关键接口

- `POST /api/tutorials/generate`
  - 入参: `{ query: string, lang?: "zh" | "en", forceRefresh?: boolean }`
  - 返回: 复用命中或任务创建结果
- `POST /api/tutorials/refresh`
  - 入参: `{ topicKey: string }`
- `GET /api/topics/:topicKey/status`
  - 返回: 当前任务状态与最新课程信息

## 数据模型

- `Topic`
- `Course`
- `GenerationJob`
- `SearchEvidence`

模型定义见 [prisma/schema.prisma](./prisma/schema.prisma)
