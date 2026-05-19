import { describe, expect, it } from 'vitest'

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
