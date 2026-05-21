import { PGVectorStore } from '@langchain/community/vectorstores/pgvector'
import { OpenAIEmbeddings } from '@langchain/openai'

import { getAiRuntimeConfig, getRagRuntimeConfig } from '../aiConfig'

export const createEmbeddings = () => {
  const { apiKey, baseUrl, embeddingModel } = getAiRuntimeConfig()

  return new OpenAIEmbeddings({
    apiKey,
    configuration: {
      baseURL: baseUrl.replace(/\/$/, ''),
    },
    model: embeddingModel,
  })
}

export const createKnowledgeVectorStore = async () => {
  const { collectionName, connectionString, tableName } = getRagRuntimeConfig()

  return PGVectorStore.initialize(createEmbeddings(), {
    collectionName,
    postgresConnectionOptions: {
      connectionString,
    },
    tableName,
  })
}
