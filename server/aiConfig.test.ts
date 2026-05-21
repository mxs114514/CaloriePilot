import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAiRuntimeConfig, getRagRuntimeConfig } from './aiConfig'

describe('AI 和 RAG 配置', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('读取 AI 聊天和 embedding 配置', () => {
    vi.stubEnv('AI_API_BASE_URL', 'https://api.example.com/v1')
    vi.stubEnv('AI_API_KEY', 'test-key')
    vi.stubEnv('AI_MODEL', 'chat-model')
    vi.stubEnv('AI_EMBEDDING_MODEL', 'embedding-model')

    expect(getAiRuntimeConfig()).toEqual({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.com/v1',
      embeddingModel: 'embedding-model',
      model: 'chat-model',
    })
  })

  it('缺少 PgVector 配置时返回明确错误', () => {
    expect(() => getRagRuntimeConfig()).toThrow('PGVECTOR_CONNECTION_STRING')
  })
})
