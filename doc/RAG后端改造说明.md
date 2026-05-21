# RAG 后端改造说明

## 环境变量

在项目根目录 `.env` 中配置：

```text
AI_API_BASE_URL=https://your-openai-compatible-endpoint/v1
AI_API_KEY=your-api-key
AI_MODEL=your-chat-model
AI_EMBEDDING_API_BASE_URL=https://your-embedding-openai-compatible-endpoint/v1
AI_EMBEDDING_API_KEY=your-embedding-api-key
AI_EMBEDDING_MODEL=your-embedding-model
PGVECTOR_CONNECTION_STRING=postgresql://calorie_pilot:calorie_pilot@localhost:5432/calorie_pilot
PGVECTOR_TABLE_NAME=calorie_pilot_knowledge_chunks
PGVECTOR_COLLECTION_NAME=calorie_pilot_knowledge
RAG_K=5
```

`AI_MODEL` 用于聊天和计划生成；`AI_EMBEDDING_MODEL` 用于 PDF 文本向量化。聊天模型和 embedding 模型可以来自不同平台，例如 DeepSeek 负责聊天，阿里千问负责 embedding。

如果聊天和 embedding 来自同一平台，可以不填 `AI_EMBEDDING_API_BASE_URL` 和 `AI_EMBEDDING_API_KEY`，程序会回退使用 `AI_API_BASE_URL` 和 `AI_API_KEY`。如果来自不同平台，必须填写独立的 embedding 地址和 key。

DeepSeek 聊天 + 阿里千问 embedding 示例：

```text
AI_API_BASE_URL=https://api.deepseek.com/v1
AI_API_KEY=你的 DeepSeek API Key
AI_MODEL=deepseek-chat
AI_EMBEDDING_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_EMBEDDING_API_KEY=你的阿里云百炼 API Key
AI_EMBEDDING_MODEL=text-embedding-v4
PGVECTOR_CONNECTION_STRING=postgresql://calorie_pilot:calorie_pilot@localhost:5432/calorie_pilot
PGVECTOR_TABLE_NAME=calorie_pilot_knowledge_chunks
PGVECTOR_COLLECTION_NAME=calorie_pilot_knowledge
RAG_K=5
```

## 启动数据库

本地 PostgreSQL + pgvector 由 `docker-compose.yml` 提供。需要人工确认后再启动：

```powershell
docker compose up -d postgres
```

首次启动容器时会执行 `server/db/init.sql`，创建 `vector` 扩展。

## 导入知识库

PDF 原始文件放在：

```text
doc/knowledge/
```

确认数据库已启动、`.env` 已配置后运行：

```powershell
pnpm knowledge:import
```

导入流程会：

1. 加载 `doc/knowledge` 下的 PDF。
2. 按页清洗文本并记录 `source`、`bookTitle`、`pageNumber`。
3. 使用 `RecursiveCharacterTextSplitter` 切分为文本块。
4. 清理当前 collection 的旧数据。
5. 分批写入 PgVector。

扫描版 PDF 如果无法提取文本，会跳过空页并输出 warning；整本为空时需要后续引入 OCR。

## 运行时行为

前端接口保持不变：

```text
POST /api/ai/chat
POST /api/ai/chat/stream
```

后端会在构造 prompt 前检索知识库，把结果注入 system prompt。RAG 检索失败时返回空上下文并降级为普通 AI 回答，不阻断聊天、计划 JSON 生成或 SSE 摘要。

## 重建向量表

更换 `AI_EMBEDDING_MODEL` 后必须重新导入知识库。不同 embedding 模型的向量维度和语义空间可能不同，旧向量与新查询向量混用会导致检索结果不稳定，甚至触发 PgVector 维度错误。

推荐流程：

```powershell
docker compose up -d postgres
pnpm knowledge:import
```
