import { describe, expect, it, vi } from 'vitest'

import { createAiChatApp } from './index'

describe('AI 对话后端接口', () => {
  const validAiGeneratedPlan = {
    days: [
      {
        dayIndex: 1,
        meals: [
          {
            calories: 420,
            description: '燕麦 40g、鸡蛋 1 个。',
            mealType: 'breakfast',
            title: '燕麦鸡蛋餐',
          },
          {
            calories: 650,
            description: '鸡胸肉 120g、米饭 150g。',
            mealType: 'lunch',
            title: '鸡胸肉米饭',
          },
          {
            calories: 420,
            description: '番茄 150g、豆腐 120g。',
            mealType: 'dinner',
            title: '番茄豆腐汤',
          },
        ],
        workouts: [
          {
            caloriesBurned: 160,
            description: '保持略微喘气的速度。',
            durationMinutes: 30,
            title: '快走',
          },
        ],
      },
    ],
    durationDays: 1,
    goal: '轻量减脂',
    startDate: '2026-05-20',
    title: '1 天轻量减脂计划',
  }

  it('拒绝非法 mode', async () => {
    const app = createAiChatApp({
      completeChat: async () => '不会调用',
    })

    const response = await app.request('/api/ai/chat', {
      body: JSON.stringify({
        messages: [],
        mode: 'invalid',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    await expect(response.json()).resolves.toEqual({
      message: 'AI 请求模式无效',
    })
    expect(response.status).toBe(400)
  })

  it('普通聊天返回 message 响应', async () => {
    const app = createAiChatApp({
      completeChat: async () => '可以从晚餐少油开始。',
    })

    const response = await app.request('/api/ai/chat', {
      body: JSON.stringify({
        messages: [{ content: '怎么减脂？', role: 'user' }],
        mode: 'chat',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    await expect(response.json()).resolves.toEqual({
      content: '可以从晚餐少油开始。',
      type: 'message',
    })
    expect(response.status).toBe(200)
  })

  it('普通聊天调用 RAG 并注入上下文', async () => {
    const completeChat = vi.fn(async () => '可以从晚餐少油开始。')
    const getKnowledgeContext = vi.fn(async () => '知识库检索结果：晚餐少油。')
    const app = createAiChatApp({
      completeChat,
      getKnowledgeContext,
    })

    await app.request('/api/ai/chat', {
      body: JSON.stringify({
        messages: [{ content: '怎么减脂？', role: 'user' }],
        mode: 'chat',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    expect(getKnowledgeContext).toHaveBeenCalledWith({
      messages: [{ content: '怎么减脂？', role: 'user' }],
      mode: 'chat',
    })
    expect(completeChat.mock.calls[0]?.[0][0]?.content).toContain('知识库检索结果：晚餐少油。')
  })

  it('计划模式调用时启用 JSON Output', async () => {
    const completeChat = vi.fn(async () =>
      JSON.stringify({
        plan: validAiGeneratedPlan,
        type: 'plan_draft',
      }),
    )
    const app = createAiChatApp({ completeChat })

    await app.request('/api/ai/chat', {
      body: JSON.stringify({
        messages: [{ content: '帮我生成计划', role: 'user' }],
        mode: 'plan',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    expect(completeChat.mock.calls[0]?.[1]).toEqual({
      maxTokens: 8192,
      responseFormat: 'json_object',
    })
  })

  it('计划模式调用 RAG 并注入上下文', async () => {
    const completeChat = vi.fn(async () =>
      JSON.stringify({
        plan: validAiGeneratedPlan,
        type: 'plan_draft',
      }),
    )
    const getKnowledgeContext = vi.fn(async () => '知识库检索结果：计划原则。')
    const app = createAiChatApp({ completeChat, getKnowledgeContext })

    await app.request('/api/ai/chat', {
      body: JSON.stringify({
        messages: [{ content: '帮我生成计划', role: 'user' }],
        mode: 'plan',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    expect(getKnowledgeContext).toHaveBeenCalledOnce()
    expect(completeChat.mock.calls[0]?.[0][0]?.content).toContain('知识库检索结果：计划原则。')
  })

  it('RAG 抛错时仍继续普通 AI 请求', async () => {
    const completeChat = vi.fn(async () => '普通回答')
    const app = createAiChatApp({
      completeChat,
      getKnowledgeContext: async () => {
        throw new Error('rag down')
      },
    })

    const response = await app.request('/api/ai/chat', {
      body: JSON.stringify({
        messages: [{ content: '怎么减脂？', role: 'user' }],
        mode: 'chat',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    await expect(response.json()).resolves.toEqual({
      content: '普通回答',
      type: 'message',
    })
    expect(completeChat).toHaveBeenCalledOnce()
  })

  it('计划模式首次返回格式无效时会带错误原因重试一次', async () => {
    const completeChat = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          plan: {
            ...validAiGeneratedPlan,
            days: [],
          },
          type: 'plan_draft',
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          plan: validAiGeneratedPlan,
          type: 'plan_draft',
        }),
      )
    const app = createAiChatApp({ completeChat })

    const response = await app.request('/api/ai/chat', {
      body: JSON.stringify({
        messages: [{ content: '帮我生成计划', role: 'user' }],
        mode: 'plan',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    expect(completeChat).toHaveBeenCalledTimes(2)
    expect(completeChat.mock.calls[1]?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('plan.days.length 必须等于 durationDays'),
          role: 'user',
        }),
      ]),
    )
    await expect(response.json()).resolves.toEqual({
      plan: validAiGeneratedPlan,
      type: 'plan_draft',
    })
  })

  it('计划模式重试后仍无效时返回具体格式错误', async () => {
    const completeChat = vi.fn(async () =>
      JSON.stringify({
        plan: {
          ...validAiGeneratedPlan,
          days: [],
        },
        type: 'plan_draft',
      }),
    )
    const app = createAiChatApp({ completeChat })

    const response = await app.request('/api/ai/chat', {
      body: JSON.stringify({
        messages: [{ content: '帮我生成计划', role: 'user' }],
        mode: 'plan',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    await expect(response.json()).resolves.toEqual({
      message: expect.stringContaining('plan.days.length 必须等于 durationDays'),
    })
    expect(response.status).toBe(500)
  })

  it('计划模式解析完整计划草案', async () => {
    const app = createAiChatApp({
      completeChat: async () =>
        JSON.stringify({
          plan: validAiGeneratedPlan,
          type: 'plan_draft',
        }),
    })

    const response = await app.request('/api/ai/chat', {
      body: JSON.stringify({
        messages: [{ content: '帮我生成计划', role: 'user' }],
        mode: 'plan',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    await expect(response.json()).resolves.toEqual({
      plan: validAiGeneratedPlan,
      type: 'plan_draft',
    })
    expect(response.status).toBe(200)
  })

  it('计划模式允许返回需要澄清响应', async () => {
    const app = createAiChatApp({
      completeChat: async () =>
        JSON.stringify({
          message: '请告诉我计划天数，例如 7 天或 14 天。',
          missingFields: ['durationDays'],
          reasons: ['ambiguous_duration'],
          type: 'needs_clarification',
        }),
    })

    const response = await app.request('/api/ai/chat', {
      body: JSON.stringify({
        messages: [{ content: '帮我做个短期计划', role: 'user' }],
        mode: 'plan',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    await expect(response.json()).resolves.toEqual({
      message: '请告诉我计划天数，例如 7 天或 14 天。',
      missingFields: ['durationDays'],
      reasons: ['ambiguous_duration'],
      type: 'needs_clarification',
    })
    expect(response.status).toBe(200)
  })

  it('普通聊天支持 SSE 流式响应', async () => {
    const app = createAiChatApp({
      completeChat: async () => '不会调用',
      completeChatStream: async function* () {
        yield '第一段'
        yield '第二段'
      },
    })

    const response = await app.request('/api/ai/chat/stream', {
      body: JSON.stringify({
        messages: [{ content: '流式测试', role: 'user' }],
        mode: 'chat',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    await expect(response.text()).resolves.toBe(
      'data: {"delta":"第一段"}\n\ndata: {"delta":"第二段"}\n\ndata: [DONE]\n\n',
    )
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    expect(response.status).toBe(200)
  })

  it('普通聊天 SSE 流式响应注入 RAG 上下文', async () => {
    let receivedMessages: Array<{ content: string; role: string }> = []
    const getKnowledgeContext = vi.fn(async () => '知识库检索结果：流式依据。')
    const app = createAiChatApp({
      completeChat: async () => '不会调用',
      completeChatStream: async function* (messages) {
        receivedMessages = messages
        yield '第一段'
      },
      getKnowledgeContext,
    })

    const response = await app.request('/api/ai/chat/stream', {
      body: JSON.stringify({
        messages: [{ content: '流式测试', role: 'user' }],
        mode: 'chat',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    await response.text()
    expect(getKnowledgeContext).toHaveBeenCalledOnce()
    expect(receivedMessages[0]?.content).toContain('知识库检索结果：流式依据。')
  })

  it('计划模式支持先返回 SSE 摘要', async () => {
    let receivedMessages: Array<{ content: string; role: string }> = []
    const app = createAiChatApp({
      completeChat: async () => '不会调用',
      completeChatStream: async function* (messages) {
        receivedMessages = messages
        yield '这是计划摘要。'
      },
    })

    const response = await app.request('/api/ai/chat/stream', {
      body: JSON.stringify({
        messages: [{ content: '帮我生成计划', role: 'user' }],
        mode: 'plan',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    await expect(response.text()).resolves.toBe('data: {"delta":"这是计划摘要。"}\n\ndata: [DONE]\n\n')
    expect(receivedMessages[0]?.content).toContain('先返回一段给用户看的计划摘要')
    expect(response.status).toBe(200)
  })
})
