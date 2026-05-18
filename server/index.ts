import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { pathToFileURL } from 'node:url'

import {
  completeOpenAiCompatibleChat,
  completeOpenAiCompatibleChatStream,
  AiClientError,
  type CompleteChat,
  type CompleteChatStream,
} from './aiClient'
import { buildChatMessages, buildPlanMessages, buildPlanSummaryMessages } from './prompts'
import { loadServerEnv } from './env'
import { isAiGeneratedPlan, type AiChatRequest } from '../src/types/ai'

interface CreateAiChatAppOptions {
  completeChat?: CompleteChat
  completeChatStream?: CompleteChatStream
}

export const createAiChatApp = (options: CreateAiChatAppOptions = {}) => {
  const app = new Hono()
  const completeChat = options.completeChat ?? completeOpenAiCompatibleChat
  const completeChatStream = options.completeChatStream ?? completeOpenAiCompatibleChatStream

  app.post('/api/ai/chat', async context => {
    const request = await readAiChatRequest(context.req)

    if (!request || (request.mode !== 'chat' && request.mode !== 'plan')) {
      return context.json({ message: 'AI 请求模式无效' }, 400)
    }

    try {
      if (request.mode === 'chat') {
        const content = await completeChat(buildChatMessages(request))

        return context.json({ content, type: 'message' as const })
      }

      const content = await completeChat(buildPlanMessages(request))
      const planDraft = parsePlanDraft(content)

      return context.json({
        content: planDraft.content,
        plan: planDraft.plan,
        type: 'plan_draft' as const,
      })
    } catch (error) {
      if (error instanceof AiClientError) {
        return context.json({ message: error.message }, error.status)
      }

      return context.json({ message: 'AI 服务暂时不可用，请稍后重试。' }, 500)
    }
  })

  app.post('/api/ai/chat/stream', async context => {
    const request = await readAiChatRequest(context.req)

    if (!request || (request.mode !== 'chat' && request.mode !== 'plan')) {
      return context.json({ message: 'AI 流式请求模式无效' }, 400)
    }

    try {
      const messages =
        request.mode === 'plan' ? buildPlanSummaryMessages(request) : buildChatMessages(request)
      const stream = createSseStream(completeChatStream(messages))

      return new Response(stream, {
        headers: {
          'cache-control': 'no-cache',
          'content-type': 'text/event-stream; charset=utf-8',
        },
      })
    } catch (error) {
      if (error instanceof AiClientError) {
        return context.json({ message: error.message }, error.status)
      }

      return context.json({ message: 'AI 服务暂时不可用，请稍后重试。' }, 500)
    }
  })

  return app
}

const createSseStream = (source: AsyncIterable<string>) => {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of source) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'AI 流式响应失败'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
        controller.close()
      }
    },
  })
}

const readAiChatRequest = async (request: Request): Promise<AiChatRequest | undefined> => {
  try {
    const body = (await request.json()) as AiChatRequest

    return body
  } catch {
    return undefined
  }
}

const parsePlanDraft = (content: string) => {
  const parsed = JSON.parse(content) as { content?: unknown; plan?: unknown }

  if (typeof parsed.content !== 'string' || !isAiGeneratedPlan(parsed.plan)) {
    throw new AiClientError('AI 返回的计划格式无效，请重新生成。')
  }

  return {
    content: parsed.content,
    plan: parsed.plan,
  }
}

const isDirectRun = () => {
  const entry = process.argv[1]

  return Boolean(entry && import.meta.url === pathToFileURL(entry).href)
}

if (isDirectRun()) {
  loadServerEnv()

  serve({
    fetch: createAiChatApp().fetch,
    port: 5174,
  })
}
