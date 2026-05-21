import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { completeOpenAiCompatibleChat } from './aiClient'

describe('OpenAI 兼容 AI 客户端', () => {
  beforeEach(() => {
    vi.stubEnv('AI_API_BASE_URL', 'https://api.deepseek.com')
    vi.stubEnv('AI_API_KEY', 'test-key')
    vi.stubEnv('AI_MODEL', 'deepseek-v4-pro')
    vi.stubEnv('AI_EMBEDDING_MODEL', 'embedding-model')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('默认非流式聊天请求不启用 JSON Output', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '普通文本回复' } }],
        }),
      ok: true,
    })
    vi.stubGlobal('fetch', fetchMock)

    await completeOpenAiCompatibleChat([{ content: '你好', role: 'user' }])

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))

    expect(requestBody).not.toHaveProperty('response_format')
    expect(requestBody).not.toHaveProperty('max_tokens')
  })

  it('按需启用 DeepSeek JSON Output 和 max_tokens', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '{"type":"needs_clarification"}' } }],
        }),
      ok: true,
    })
    vi.stubGlobal('fetch', fetchMock)

    await completeOpenAiCompatibleChat([{ content: '请返回 json', role: 'user' }], {
      maxTokens: 8192,
      responseFormat: 'json_object',
    })

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))

    expect(requestBody).toMatchObject({
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    })
  })
})
