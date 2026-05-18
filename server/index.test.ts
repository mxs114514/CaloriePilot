import { describe, expect, it } from 'vitest'

import { createAiChatApp } from './index'

describe('AI 对话后端接口', () => {
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
          content: '已按你的偏好生成计划。',
          plan: {
            days: [{ checkins: [], dayIndex: 1, meals: [], workouts: [] }],
            summary: '第一天先建立节奏。',
            title: '3 天轻量计划',
          },
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
      content: '已按你的偏好生成计划。',
      plan: {
        days: [{ checkins: [], dayIndex: 1, meals: [], workouts: [] }],
        summary: '第一天先建立节奏。',
        title: '3 天轻量计划',
      },
      type: 'plan_draft',
    })
    expect(response.status).toBe(200)
  })
})
