# CaloriePilot

CaloriePilot 是一个基于 Vue 3 的热量、体重与目标计划管理应用。项目提供本地优先的前端记录体验，并通过 Node.js/Hono 后端接入 AI 对话、计划生成和基于 LangChain + PostgreSQL pgvector 的 RAG 知识库检索。

## 功能概览

- 记录每日饮食热量、体重变化和目标计划。
- 查看历史数据与趋势图表。
- 维护个人资料，并基于资料生成计划。
- 使用 AI 聊天辅助饮食、运动和计划调整。
- 支持 AI 生成结构化计划草案，并在后端进行响应格式校验。
- 支持从 `doc/knowledge` 导入知识库文档，通过 pgvector 为 AI 回答补充 RAG 上下文。
- 支持 PWA 安装与自动更新。

## 技术栈

- 前端：Vue 3、Vue Router、Pinia、Vant、Dexie、ECharts、Vite、Vite PWA
- 后端：Node.js、Hono、TypeScript、LangChain.js、OpenAI 兼容接口
- RAG：OpenAIEmbeddings、PGVectorStore、PostgreSQL、pgvector
- 工程化：pnpm、Vitest、vue-tsc、ESLint、Prettier

## 目录结构

```text
.
├── src/                    # 前端应用源码
│   ├── pages/              # 页面：记录、计划、历史、AI 聊天、个人资料
│   ├── services/           # 前端数据服务与 IndexedDB 访问
│   ├── stores/             # Pinia 状态
│   └── router/             # 前端路由
├── server/                 # 后端 AI 与 RAG 服务
│   ├── rag/                # 文档加载、切分、向量库、检索上下文
│   ├── scripts/            # 知识库导入脚本
│   └── db/                 # pgvector 初始化 SQL
├── shared/                 # 前后端共享类型与校验
├── doc/                    # 项目文档和知识库资料
├── public/                 # PWA 图标与静态资源
└── docker-compose.yml      # 本地 PostgreSQL + pgvector
```

## 环境要求

- Node.js `^18.18.0 || >=20.0.0`
- pnpm `10.28.0`
- 如需使用 RAG 知识库：Docker 与 Docker Compose

## 快速开始

安装依赖：

```powershell
pnpm install
```

复制环境变量模板：

```powershell
Copy-Item env.example .env
```

按需填写 `.env`：

```text
AI_API_BASE_URL=
AI_API_KEY=
AI_MODEL=
AI_EMBEDDING_API_BASE_URL=
AI_EMBEDDING_API_KEY=
AI_EMBEDDING_MODEL=
PGVECTOR_CONNECTION_STRING=postgresql://calorie_pilot:calorie_pilot@localhost:5432/calorie_pilot
PGVECTOR_TABLE_NAME=calorie_pilot_knowledge_chunks
PGVECTOR_COLLECTION_NAME=calorie_pilot_knowledge
RAG_K=5
```

启动前端开发服务：

```powershell
pnpm dev
```

启动后端 API 服务：

```powershell
pnpm dev:api
```

也可以同时启动前后端：

```powershell
pnpm dev:all
```

默认端口：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:5174`
- Vite 会将 `/api` 代理到 `http://localhost:5174`

## RAG 知识库

项目使用 `docker-compose.yml` 提供本地 PostgreSQL + pgvector。需要使用知识库检索时，先启动数据库：

```powershell
docker compose up -d postgres
```

确认 `.env` 中已配置聊天模型、embedding 模型和 PgVector 连接信息后，导入 `doc/knowledge` 下的知识库文档：

```powershell
pnpm knowledge:import
```

导入脚本会加载文档、切分文本块、清理当前 collection 的旧数据，并批量写入向量库。修改 embedding 模型后，应重新导入知识库，避免向量维度或语义空间不一致。

## 常用脚本

```powershell
pnpm dev              # 启动 Vite 前端开发服务
pnpm dev:api          # 启动 Hono 后端 API 服务
pnpm dev:all          # 同时启动前端和后端
pnpm knowledge:import # 导入 RAG 知识库
pnpm test             # 运行 Vitest 测试
pnpm build            # 类型检查并构建生产产物
pnpm preview          # 预览生产构建
pnpm lint             # 运行 ESLint 自动修复
pnpm format           # 格式化 src 目录
```

## 后端 API

当前后端提供 AI 聊天相关接口：

- `POST /api/ai/chat`：普通请求，返回 AI 文本消息、计划草案或澄清请求。
- `POST /api/ai/chat/stream`：流式请求，使用 Server-Sent Events 返回增量文本。

前端调用结构定义在 `shared/ai.ts`，后端在返回计划草案前会校验 JSON 结构，避免不完整或格式错误的计划进入前端流程。

## 开发约定

- 文本文件默认按 UTF-8 处理。
- 默认使用 TypeScript 与组合式 API。
- 新增业务逻辑时优先补充就近测试，例如 `*.test.ts` 放在被测源码同目录。
- 不要手写 `pnpm-lock.yaml`，依赖变更应通过 pnpm 命令生成。
- 本地长期运行服务需要按需手动启动；知识库导入依赖 PostgreSQL 与有效 AI/embedding 配置。

