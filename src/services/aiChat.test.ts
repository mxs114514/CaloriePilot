import type { AiGeneratedPlan, GoalPlan, UserProfile } from '@/types'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const recentHistoryMock = vi.hoisted(() => ({
  getAiRecentHistorySummary: vi.fn(),
}))

vi.mock('./aiRecentHistory', () => ({
  getAiRecentHistorySummary: recentHistoryMock.getAiRecentHistorySummary,
}))

import { preloadAiRecentHistory, sendAiChatRequest, sendAiChatStreamRequest } from './aiChat'

describe('AI 对话服务', () => {
  const profile: UserProfile = {
    activityLevel: 'light',
    age: 30,
    bmi: 23.5,
    createdAt: '2026-05-18T08:00:00.000Z',
    currentWeightKg: 70,
    dailyCalorieTarget: 1600,
    dietPreference: '少油',
    gender: 'female',
    heightCm: 165,
    id: 'profile-a',
    name: '莫莫',
    tdee: 2100,
    updatedAt: '2026-05-18T08:00:00.000Z',
  }
  const activePlan: GoalPlan = {
    createdAt: '2026-05-18T08:00:00.000Z',
    dailyCalorieTarget: 1600,
    durationDays: 7,
    id: 'plan-a',
    startDate: '2026-05-18',
    startWeightKg: 70,
    status: 'active',
    updatedAt: '2026-05-18T08:00:00.000Z',
    weightLossTargetKg: 1,
  }
  const draftPlan: AiGeneratedPlan = {
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
        workouts: [],
      },
    ],
    durationDays: 1,
    goal: '轻量减脂',
    startDate: '2026-05-20',
    title: '1 天轻量减脂计划',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    recentHistoryMock.getAiRecentHistorySummary.mockClear()
    recentHistoryMock.getAiRecentHistorySummary.mockResolvedValue({
      calories: '最近 7 天暂无热量记录。',
      weight: '最近 7 天暂无体重记录。',
    })
  })

  it('发送普通聊天请求时携带用户资料、当前计划和最近历史', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ content: '可以先从晚餐少油开始。', type: 'message' }),
      ok: true,
    })

    const response = await sendAiChatRequest(
      {
        activePlan,
        messages: [{ content: '怎么减脂？', role: 'user' }],
        mode: 'chat',
        profile,
      },
      { fetcher: fetchMock },
    )

    expect(response).toEqual({ content: '可以先从晚餐少油开始。', type: 'message' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/chat',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    const firstCallOptions = fetchMock.mock.calls[0]?.[1] as RequestInit

    expect(JSON.parse(String(firstCallOptions.body))).toMatchObject({
      activePlan: { id: 'plan-a' },
      mode: 'chat',
      profile: { id: 'profile-a' },
      recentHistory: {
        calories: '最近 7 天暂无热量记录。',
        weight: '最近 7 天暂无体重记录。',
      },
    })
  })

  it('可以预加载最近历史并在发送时复用，且最多只发送最近 10 条消息', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ content: '可以。', type: 'message' }),
      ok: true,
    })
    const recentHistory = await preloadAiRecentHistory(activePlan)
    const messages = Array.from({ length: 12 }, (_, index) => ({
      content: `消息 ${index + 1}`,
      role: 'user' as const,
    }))

    await sendAiChatRequest(
      {
        activePlan,
        messages,
        mode: 'chat',
        profile,
        recentHistory,
      },
      { fetcher: fetchMock },
    )

    const firstCallOptions = fetchMock.mock.calls[0]?.[1] as RequestInit
    const requestBody = JSON.parse(String(firstCallOptions.body))

    expect(recentHistoryMock.getAiRecentHistorySummary).toHaveBeenCalledTimes(1)
    expect(requestBody.recentHistory).toEqual({
      calories: '最近 7 天暂无热量记录。',
      weight: '最近 7 天暂无体重记录。',
    })
    expect(requestBody.messages).toHaveLength(10)
    expect(requestBody.messages[0]).toEqual({ content: '消息 3', role: 'user' })
    expect(requestBody.messages[9]).toEqual({ content: '消息 12', role: 'user' })
  })

  it('计划调整请求会携带当前草案', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ plan: draftPlan, type: 'plan_draft' }),
      ok: true,
    })

    await sendAiChatRequest(
      {
        activePlan,
        draftPlan,
        messages: [{ content: '多跑步', role: 'user' }],
        mode: 'plan',
        profile,
      },
      { fetcher: fetchMock },
    )

    const firstCallOptions = fetchMock.mock.calls[0]?.[1] as RequestInit

    expect(JSON.parse(String(firstCallOptions.body))).toMatchObject({
      draftPlan: { title: '1 天轻量减脂计划' },
      mode: 'plan',
    })
  })

  it('计划请求支持需要澄清响应', async () => {
    const clarificationResponse = {
      message: '请告诉我目标方向，例如减脂或增肌。',
      missingFields: ['goal'],
      reasons: [],
      type: 'needs_clarification',
    } as const
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(clarificationResponse),
      ok: true,
    })

    await expect(
      sendAiChatRequest(
        {
          messages: [{ content: '帮我做个计划', role: 'user' }],
          mode: 'plan',
        },
        { fetcher: fetchMock },
      ),
    ).resolves.toEqual(clarificationResponse)
  })

  it('计划请求支持无 content 的新草案响应', async () => {
    const draftResponse = {
      plan: draftPlan,
      type: 'plan_draft',
    } as const
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(draftResponse),
      ok: true,
    })

    await expect(
      sendAiChatRequest(
        {
          messages: [{ content: '生成 1 天轻量减脂计划，明天开始', role: 'user' }],
          mode: 'plan',
        },
        { fetcher: fetchMock },
      ),
    ).resolves.toEqual(draftResponse)
  })

  it('后端错误会转换为用户可读错误', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ message: 'AI 服务未配置' }),
      ok: false,
    })

    await expect(
      sendAiChatRequest(
        {
          messages: [{ content: '测试', role: 'user' }],
          mode: 'chat',
        },
        { fetcher: fetchMock },
      ),
    ).rejects.toThrow('AI 服务未配置')
  })

  it('流式聊天请求会按 SSE 增量回调', async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('data: {"delta":"第一段"}\n\n'))
        controller.enqueue(encoder.encode('data: {"delta":"第二段"}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    const fetchMock = vi.fn().mockResolvedValue({
      body: stream,
      ok: true,
    })
    const onDelta = vi.fn()

    await sendAiChatStreamRequest(
      {
        activePlan,
        messages: [{ content: '流式测试', role: 'user' }],
        mode: 'chat',
        profile,
      },
      {
        fetcher: fetchMock,
        onDelta,
      },
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/chat/stream',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(onDelta).toHaveBeenNthCalledWith(1, '第一段')
    expect(onDelta).toHaveBeenNthCalledWith(2, '第二段')
  })

  it('计划模式也可以发起流式摘要请求', async () => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('data: {"delta":"先生成摘要"}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    const fetchMock = vi.fn().mockResolvedValue({
      body: stream,
      ok: true,
    })
    const onDelta = vi.fn()

    await sendAiChatStreamRequest(
      {
        activePlan,
        messages: [{ content: '生成计划', role: 'user' }],
        mode: 'plan',
        profile,
      },
      {
        fetcher: fetchMock,
        onDelta,
      },
    )

    const firstCallOptions = fetchMock.mock.calls[0]?.[1] as RequestInit

    expect(JSON.parse(String(firstCallOptions.body))).toMatchObject({
      mode: 'plan',
    })
    expect(onDelta).toHaveBeenCalledWith('先生成摘要')
  })

  it('流式聊天遇到非 JSON 错误响应时返回通用错误', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.reject(new SyntaxError('Unexpected non-whitespace character')),
      ok: false,
      text: () => Promise.resolve('404 Not Found'),
    })

    await expect(
      sendAiChatStreamRequest(
        {
          messages: [{ content: '测试', role: 'user' }],
          mode: 'chat',
        },
        {
          fetcher: fetchMock,
          onDelta: vi.fn(),
        },
      ),
    ).rejects.toThrow('AI 请求失败，请稍后重试')
  })
})
