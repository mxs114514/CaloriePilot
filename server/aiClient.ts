import OpenAI from 'openai'

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

/**
 * 调用兼容 OpenAI 格式 API 的无流式对话补全方法
 * 发送请求以获取单次完整的 AI 回复
 * @param messages 聊天记录数组
 * @returns AI 回复的完整字符串内容
 */
export const completeOpenAiCompatibleChat: CompleteChat = async (messages, options) => {
  const { apiKey, baseUrl, model } = getAiConfig()
  const requestBody: Record<string, unknown> = {
    messages,
    model,
    temperature: 0.4,
  }

  if (options?.responseFormat) {
    requestBody.response_format = { type: options.responseFormat }
  }

  if (typeof options?.maxTokens === 'number') {
    requestBody.max_tokens = options.maxTokens
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    body: JSON.stringify(requestBody),
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  }).catch(() => {
    throw new AiClientError('AI 服务网络请求失败，请稍后重试。')
  })

  if (!response.ok) {
    throw new AiClientError('AI 服务调用失败，请检查模型配置或稍后重试。', response.status)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content

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
  const { apiKey, baseUrl, model } = getAiConfig()
  const openai = new OpenAI({
    apiKey,
    baseURL: baseUrl,
  })

  const stream = await openai.chat.completions.create({
    messages,
    model,
    stream: true,
    temperature: 0.4,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content

    if (delta) {
      yield delta
    }
  }
}

/**
 * 获取并校验 AI 服务所需的配置环境变量
 * @returns 包含 apiKey、baseUrl 和 model 的配置对象
 * @throws 缺少必要环境变量时抛出相应提示的 AiClientError
 */
const getAiConfig = () => {
  const baseUrl = process.env.AI_API_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL

  if (!baseUrl || !apiKey || !model) {
    throw new AiClientError('AI 服务未配置，请先填写 AI_API_BASE_URL、AI_API_KEY 和 AI_MODEL。')
  }

  return {
    apiKey,
    baseUrl,
    model,
  }
}
