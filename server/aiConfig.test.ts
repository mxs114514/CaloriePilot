import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAiRuntimeConfig, getEmbeddingRuntimeConfig, getRagRuntimeConfig } from './aiConfig'

describe('AI 和 RAG 配置', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('读取 AI 聊天配置', () => {
    vi.stubEnv('AI_API_BASE_URL', 'https://api.example.com/v1')
    vi.stubEnv('AI_API_KEY', 'test-key')
    vi.stubEnv('AI_MODEL', 'chat-model')

    expect(getAiRuntimeConfig()).toEqual({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.com/v1',
      model: 'chat-model',
    })
  })

  it('优先读取独立 embedding 平台配置', () => {
    vi.stubEnv('AI_API_BASE_URL', 'https://deepseek.example.com/v1')
    vi.stubEnv('AI_API_KEY', 'deepseek-key')
    vi.stubEnv('AI_MODEL', 'deepseek-chat')
    vi.stubEnv('AI_EMBEDDING_API_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1')
    vi.stubEnv('AI_EMBEDDING_API_KEY', 'qwen-key')
    vi.stubEnv('AI_EMBEDDING_MODEL', 'text-embedding-v4')

    expect(getEmbeddingRuntimeConfig()).toEqual({
      apiKey: 'qwen-key',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'text-embedding-v4',
    })
  })

  it('未配置独立 embedding 地址和 key 时回退到通用 AI 配置', () => {
    vi.stubEnv('AI_API_BASE_URL', 'https://api.example.com/v1')
    vi.stubEnv('AI_API_KEY', 'test-key')
    vi.stubEnv('AI_MODEL', 'chat-model')
    vi.stubEnv('AI_EMBEDDING_MODEL', 'embedding-model')

    expect(getEmbeddingRuntimeConfig()).toEqual({
      apiKey: 'test-key',
      baseUrl: 'https://api.example.com/v1',
      model: 'embedding-model',
    })
  })

  it('缺少 embedding 模型名称时返回明确错误', () => {
    vi.stubEnv('AI_API_BASE_URL', 'https://api.example.com/v1')
    vi.stubEnv('AI_API_KEY', 'test-key')

    expect(() => getEmbeddingRuntimeConfig()).toThrow('AI_EMBEDDING_MODEL')
  })

  it('缺少 PgVector 配置时返回明确错误', () => {
    expect(() => getRagRuntimeConfig()).toThrow('PGVECTOR_CONNECTION_STRING')
  })
})
