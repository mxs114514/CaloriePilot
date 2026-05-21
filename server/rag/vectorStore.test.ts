import { beforeEach, describe, expect, it, vi } from 'vitest'

const vectorStoreMock = vi.hoisted(() => ({
  embeddingsOptions: [] as unknown[],
  initialize: vi.fn(),
}))

vi.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: vi.fn().mockImplementation(function (options) {
    vectorStoreMock.embeddingsOptions.push(options)

    return { type: 'OpenAIEmbeddings' }
  }),
}))

vi.mock('@langchain/community/vectorstores/pgvector', () => ({
  PGVectorStore: {
    initialize: vectorStoreMock.initialize,
  },
}))

import { createEmbeddings, createKnowledgeVectorStore } from './vectorStore'

describe('PgVector 知识库向量存储', () => {
  beforeEach(() => {
    vi.stubEnv('AI_API_BASE_URL', 'https://deepseek.example.com/v1/')
    vi.stubEnv('AI_API_KEY', 'deepseek-key')
    vi.stubEnv('AI_MODEL', 'deepseek-chat')
    vi.stubEnv('AI_EMBEDDING_API_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1/')
    vi.stubEnv('AI_EMBEDDING_API_KEY', 'qwen-key')
    vi.stubEnv('AI_EMBEDDING_MODEL', 'text-embedding-v4')
    vi.stubEnv('PGVECTOR_CONNECTION_STRING', 'postgresql://user:pass@localhost:5432/db')
    vi.stubEnv('PGVECTOR_TABLE_NAME', 'knowledge_chunks')
    vi.stubEnv('PGVECTOR_COLLECTION_NAME', 'knowledge')
    vectorStoreMock.embeddingsOptions = []
    vectorStoreMock.initialize.mockReset()
  })

  it('使用 OpenAIEmbeddings 初始化 embedding 模型', () => {
    createEmbeddings()

    expect(vectorStoreMock.embeddingsOptions[0]).toMatchObject({
      apiKey: 'qwen-key',
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      },
      model: 'text-embedding-v4',
    })
  })

  it('使用 PgVector 配置初始化向量存储', async () => {
    const store = { type: 'PGVectorStore' }
    vectorStoreMock.initialize.mockResolvedValue(store)

    await expect(createKnowledgeVectorStore()).resolves.toBe(store)
    expect(vectorStoreMock.initialize).toHaveBeenCalledWith(
      { type: 'OpenAIEmbeddings' },
      expect.objectContaining({
        collectionName: 'knowledge',
        collectionTableName: 'knowledge_chunks_collections',
        postgresConnectionOptions: {
          connectionString: 'postgresql://user:pass@localhost:5432/db',
        },
        tableName: 'knowledge_chunks',
      }),
    )
  })
})
