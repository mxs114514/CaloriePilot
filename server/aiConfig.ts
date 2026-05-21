import { AiClientError } from './aiClient'

export const getAiRuntimeConfig = () => {
  const baseUrl = process.env.AI_API_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL
  const embeddingModel = process.env.AI_EMBEDDING_MODEL

  if (!baseUrl || !apiKey || !model || !embeddingModel) {
    throw new AiClientError(
      'AI 服务未配置，请先填写 AI_API_BASE_URL、AI_API_KEY、AI_MODEL 和 AI_EMBEDDING_MODEL。',
    )
  }

  return {
    apiKey,
    baseUrl,
    embeddingModel,
    model,
  }
}

export const getRagRuntimeConfig = () => {
  const connectionString = process.env.PGVECTOR_CONNECTION_STRING
  const tableName = process.env.PGVECTOR_TABLE_NAME || 'calorie_pilot_knowledge_chunks'
  const collectionName = process.env.PGVECTOR_COLLECTION_NAME || 'calorie_pilot_knowledge'
  const k = Number(process.env.RAG_K || 5)

  if (!connectionString) {
    throw new AiClientError('RAG 服务未配置，请先填写 PGVECTOR_CONNECTION_STRING。')
  }

  return {
    collectionName,
    connectionString,
    k: Number.isInteger(k) && k > 0 ? k : 5,
    tableName,
  }
}
