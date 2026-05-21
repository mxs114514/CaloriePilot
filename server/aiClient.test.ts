import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const chatOpenAiMock = vi.hoisted(() => ({
  constructorOptions: [] as unknown[],
  invoke: vi.fn(),
  stream: vi.fn(),
}))

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(function (options) {
    chatOpenAiMock.constructorOptions.push(options)

    return {
      invoke: chatOpenAiMock.invoke,
      stream: chatOpenAiMock.stream,
    }
  }),
}))

import { completeOpenAiCompatibleChat, completeOpenAiCompatibleChatStream } from './aiClient'

describe('OpenAI 兼容 AI 客户端', () => {
  beforeEach(() => {
    vi.stubEnv('AI_API_BASE_URL', 'https://api.deepseek.com')
    vi.stubEnv('AI_API_KEY', 'test-key')
    vi.stubEnv('AI_MODEL', 'deepseek-v4-pro')
    vi.stubEnv('AI_EMBEDDING_MODEL', 'embedding-model')
    chatOpenAiMock.constructorOptions = []
    chatOpenAiMock.invoke.mockReset()
    chatOpenAiMock.stream.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('默认非流式聊天请求不启用 JSON Output', async () => {
    chatOpenAiMock.invoke.mockResolvedValue({ content: '普通文本回复' })

    const content = await completeOpenAiCompatibleChat([{ content: '你好', role: 'user' }])

    expect(content).toBe('普通文本回复')
    expect(chatOpenAiMock.constructorOptions[0]).toMatchObject({
      apiKey: 'test-key',
      configuration: {
        baseURL: 'https://api.deepseek.com',
      },
      model: 'deepseek-v4-pro',
      streamUsage: false,
      temperature: 0.4,
    })
    expect(chatOpenAiMock.constructorOptions[0]).not.toHaveProperty('modelKwargs')
    expect(chatOpenAiMock.constructorOptions[0]).not.toHaveProperty('maxTokens')
  })

  it('按需启用 DeepSeek JSON Output 和 max_tokens', async () => {
    chatOpenAiMock.invoke.mockResolvedValue({ content: '{"type":"needs_clarification"}' })

    await completeOpenAiCompatibleChat([{ content: '请返回 json', role: 'user' }], {
      maxTokens: 8192,
      responseFormat: 'json_object',
    })

    expect(chatOpenAiMock.constructorOptions[0]).toMatchObject({
      maxTokens: 8192,
      modelKwargs: {
        response_format: { type: 'json_object' },
      },
    })
  })

  it('流式聊天逐段 yield 文本', async () => {
    async function* streamChunks() {
      yield { content: '你' }
      yield { content: '好' }
      yield { content: '' }
    }

    chatOpenAiMock.stream.mockResolvedValue(streamChunks())

    const chunks: string[] = []
    for await (const chunk of completeOpenAiCompatibleChatStream([{ content: '你好', role: 'user' }])) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['你', '好'])
  })
})
