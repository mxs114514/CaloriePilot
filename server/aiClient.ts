import { ChatOpenAI } from '@langchain/openai'

import { getAiRuntimeConfig } from './aiConfig'

/**
 * AI 聊天消息接口定义
 */
interface ChatCompletionMessage {
  content: string
  role: 'assistant' | 'system' | 'user'
}

/**
 * 自定义 AI 客户端错误类
 * 用于包装和抛出 AI 请求过程中的各类业务或网络异常
 */
export class AiClientError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message)
    this.name = 'AiClientError'
  }
}

/**
 * 普通(非流式) AI 聊天请求函数类型定义
 */
export interface CompleteChatOptions {
  maxTokens?: number
  responseFormat?: 'json_object'
}

export type CompleteChat = (
  messages: ChatCompletionMessage[],
  options?: CompleteChatOptions,
) => Promise<string>
/**
 * 流式 AI 聊天请求函数类型定义
 */
export type CompleteChatStream = (messages: ChatCompletionMessage[]) => AsyncIterable<string>

const createChatModel = (options?: CompleteChatOptions) => {
  const { apiKey, baseUrl, model } = getAiRuntimeConfig()

  return new ChatOpenAI({
    apiKey,
    configuration: {
      baseURL: baseUrl.replace(/\/$/, ''),
    },
    model,
    ...(typeof options?.maxTokens === 'number' ? { maxTokens: options.maxTokens } : {}),
    ...(options?.responseFormat
      ? { modelKwargs: { response_format: { type: options.responseFormat } } }
      : {}),
    streamUsage: false,
    temperature: 0.4,
  })
}

const extractTextContent = (content: unknown) => {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (
          item &&
          typeof item === 'object' &&
          'text' in item &&
          typeof item.text === 'string'
        ) {
          return item.text
        }

        return ''
      })
      .join('')
  }

  return ''
}

const toAiClientError = (error: unknown) => {
  if (error instanceof AiClientError) {
    return error
  }

  return new AiClientError('AI 服务调用失败，请检查模型配置或稍后重试。')
}

/**
 * 调用兼容 OpenAI 格式 API 的无流式对话补全方法
 * 发送请求以获取单次完整的 AI 回复
 * @param messages 聊天记录数组
 * @returns AI 回复的完整字符串内容
 */
export const completeOpenAiCompatibleChat: CompleteChat = async (messages, options) => {
  const model = createChatModel(options)
  const response = await model.invoke(messages).catch((error: unknown) => {
    throw toAiClientError(error)
  })
  const content = extractTextContent(response.content)

  if (!content) {
    throw new AiClientError('AI 服务返回内容为空，请稍后重试。')
  }

  return content
}

/**
 * 调用兼容 OpenAI 格式 API 的流式对话补全方法
 * 利用 AsyncGenerator 函数逐个处理大模型通过 Stream 返回的增量文本响应
 * @param messages 聊天记录数组
 * @returns 包含流式文字块的 AsyncIterable 对象
 */
export const completeOpenAiCompatibleChatStream: CompleteChatStream = async function* (messages) {
  const model = createChatModel()
  const stream = await model.stream(messages).catch((error: unknown) => {
    throw toAiClientError(error)
  })

  try {
    for await (const chunk of stream) {
      const delta = extractTextContent(chunk.content)

      if (delta) {
        yield delta
      }
    }
  } catch (error) {
    throw toAiClientError(error)
  }
}
