interface ChatCompletionMessage {
  content: string
  role: 'assistant' | 'system' | 'user'
}

export class AiClientError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
  ) {
    super(message)
    this.name = 'AiClientError'
  }
}

export type CompleteChat = (messages: ChatCompletionMessage[]) => Promise<string>

export const completeOpenAiCompatibleChat: CompleteChat = async messages => {
  const baseUrl = process.env.AI_API_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL

  if (!baseUrl || !apiKey || !model) {
    throw new AiClientError('AI 服务未配置，请先填写 AI_API_BASE_URL、AI_API_KEY 和 AI_MODEL。')
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    body: JSON.stringify({
      messages,
      model,
      temperature: 0.4,
    }),
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
