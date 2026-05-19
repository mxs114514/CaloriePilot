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
import { isAiGeneratedPlan, type AiChatRequest } from '../shared/ai'

/**
 * 创建 AI 聊天服务的基础配置选项接口
 */
interface CreateAiChatAppOptions {
  completeChat?: CompleteChat
  completeChatStream?: CompleteChatStream
}

/**
 * 创建基于 Hono 的后端 AI 对话支持应用实例
 * @param options 可选参数。用于注入自定义的 AI 调用方法以替换默认行为（常用于测试环境中的 Mock 注入）
 * @returns 返回一个包含 '/api/ai/chat' 及 '/api/ai/chat/stream' 路由配置的 Hono 应用对象
 */
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

/**
 * 将常规 AsyncIterable 异步字符串流包装成符合 Server-Sent Events (SSE) 标准的 ReadableStream
 * @param source 一系列待输出的文字块所构成的 AsyncIterable（如底层大模型流式接口的返回数据）
 * @returns 用于 fetch/原生 HTTP 响应的浏览器兼容 ReadableStream 对象
 */
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

/**
 * 将传来的 Request 请求体解析并断言成我们所需的 AiChatRequest 模型接口
 * 如果失败则静默拦截，并返回一个 undefined 指示不可用
 * @param request node-Hono / Web Request 对象副本
 * @returns {Promise<AiChatRequest | undefined>} 分析后的有效体，如果验证失败或抛出错误将返回 undefined
 */
const readAiChatRequest = async (request: Request): Promise<AiChatRequest | undefined> => {
  try {
    const body = (await request.json()) as AiChatRequest

    return body
  } catch {
    return undefined
  }
}

/**
 * 校验反序列化内容，确认 AI 回复的内容是一个支持结构化计划的 JSON，并将最终文本、计划体抽出来返回
 * 格式不合要求或残缺将抛出 AiClientError
 * @param content AI 大模型侧返回的包含JSON结果的无转义原始字符串
 * @returns {content: unknown, plan: AiGeneratedPlan} 包含一段对用户的说明以及符合 AiGeneratedPlan 约定的计划实体
 */
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

/**
 * 判断当前脚本进程是直接作为一个独立的入口运行 (通常通过 node command/tsx)，还是借作为由其他测试等调用的导入运行(import)
 * 这决定着服务是否应立即启动监听套接字
 * @returns 判定为主模块后返回 true
 */
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
