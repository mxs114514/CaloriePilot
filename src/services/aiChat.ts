import type {
  AiChatMessage,
  AiChatRequest,
  AiChatResponse,
  AiGeneratedPlan,
  AiRecentHistory,
  GoalPlan,
  UserProfile,
} from '@/types'

import { getAiRecentHistorySummary } from './aiRecentHistory'

interface SendAiChatRequestInput {
  activePlan?: GoalPlan | null
  draftPlan?: AiGeneratedPlan | null
  messages: AiChatMessage[]
  mode: 'chat' | 'plan'
  profile?: UserProfile | null
  recentHistory?: AiRecentHistory
}

interface SendAiChatRequestOptions {
  fetcher?: typeof fetch
}

interface SendAiChatStreamRequestOptions extends SendAiChatRequestOptions {
  onDelta: (delta: string) => void
}

interface AiErrorResponse {
  message?: string
}

const MAX_REQUEST_MESSAGES = 10

export const preloadAiRecentHistory = async (activePlan: GoalPlan): Promise<AiRecentHistory> =>
  getAiRecentHistorySummary(activePlan)

export const sendAiChatRequest = async (
  input: SendAiChatRequestInput,
  options: SendAiChatRequestOptions = {},
): Promise<AiChatResponse> => {
  const fetcher = options.fetcher ?? fetch
  const request = await buildAiChatRequest(input)
  const response = await fetcher('/api/ai/chat', {
    body: JSON.stringify(request),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  })
  const data = (await response.json()) as AiChatResponse | AiErrorResponse

  if (!response.ok) {
    throw new Error('message' in data && data.message ? data.message : 'AI 请求失败，请稍后重试')
  }

  return data as AiChatResponse
}

export const sendAiChatStreamRequest = async (
  input: SendAiChatRequestInput,
  options: SendAiChatStreamRequestOptions,
): Promise<void> => {
  const fetcher = options.fetcher ?? fetch
  const request = await buildAiChatRequest(input)
  const response = await fetcher('/api/ai/chat/stream', {
    body: JSON.stringify(request),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  if (!response.body) {
    throw new Error('浏览器不支持 AI 流式响应')
  }

  await readSseStream(response.body, options.onDelta)
}

const readErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as AiErrorResponse

    return data.message || 'AI 请求失败，请稍后重试'
  } catch {
    return 'AI 请求失败，请稍后重试'
  }
}

const buildAiChatRequest = async (input: SendAiChatRequestInput): Promise<AiChatRequest> => {
  const recentHistory = input.recentHistory ?? (input.activePlan
    ? await getAiRecentHistorySummary(input.activePlan)
    : undefined)

  return {
    activePlan: input.activePlan ?? undefined,
    draftPlan: input.draftPlan ?? undefined,
    messages: input.messages.slice(-MAX_REQUEST_MESSAGES),
    mode: input.mode,
    profile: input.profile ?? undefined,
    recentHistory,
  }
}

const readSseStream = async (body: ReadableStream<Uint8Array>, onDelta: (delta: string) => void) => {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      handleSseEvent(event, onDelta)
    }
  }

  if (buffer) {
    handleSseEvent(buffer, onDelta)
  }
}

const handleSseEvent = (event: string, onDelta: (delta: string) => void) => {
  const dataLine = event
    .split('\n')
    .map(line => line.trim())
    .find(line => line.startsWith('data:'))

  if (!dataLine) return

  const data = dataLine.slice('data:'.length).trim()

  if (!data || data === '[DONE]') return

  const parsed = JSON.parse(data) as { delta?: string; error?: string }

  if (parsed.error) {
    throw new Error(parsed.error)
  }

  if (parsed.delta) {
    onDelta(parsed.delta)
  }
}
