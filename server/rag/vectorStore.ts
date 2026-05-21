import { PGVectorStore } from '@langchain/community/vectorstores/pgvector'
import { OpenAIEmbeddings } from '@langchain/openai'

import { getEmbeddingRuntimeConfig, getRagRuntimeConfig } from '../aiConfig'

export const createEmbeddings = () => {
  const { apiKey, baseUrl, model } = getEmbeddingRuntimeConfig()

  return new OpenAIEmbeddings({
    apiKey,
    configuration: {
      baseURL: baseUrl.replace(/\/$/, ''),
    },
    model,
  })
}

export const createKnowledgeVectorStore = async () => {
  const { collectionName, connectionString, tableName } = getRagRuntimeConfig()

  return PGVectorStore.initialize(createEmbeddings(), {
    collectionName,
    collectionTableName: `${tableName}_collections`,
    postgresConnectionOptions: {
      connectionString,
    },
    tableName,
  })
}
