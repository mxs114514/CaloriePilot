import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { pathToFileURL } from 'node:url'

import { completeOpenAiCompatibleChat, AiClientError, type CompleteChat } from './aiClient'
import { buildChatMessages, buildPlanMessages } from './prompts'
import { loadServerEnv } from './env'
import { isAiGeneratedPlan, type AiChatRequest } from '../src/types/ai'

interface CreateAiChatAppOptions {
  completeChat?: CompleteChat
}

export const createAiChatApp = (options: CreateAiChatAppOptions = {}) => {
  const app = new Hono()
  const completeChat = options.completeChat ?? completeOpenAiCompatibleChat

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

  return app
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
