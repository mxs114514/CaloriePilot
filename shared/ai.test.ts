import { describe, expect, it } from 'vitest'

import { isAiGeneratedPlan, type AiChatRequest, type AiGeneratedPlan } from './ai'

describe('共享 AI 类型契约', () => {
  const validPlan: AiGeneratedPlan = {
    days: [
      {
        checkins: [],
        dayIndex: 1,
        meals: [],
        workouts: [],
      },
    ],
    summary: '先建立饮食和运动节奏。',
    title: '轻量计划',
  }

  it('校验 AI 返回的计划草案结构', () => {
    expect(isAiGeneratedPlan(validPlan)).toBe(true)
  })

  it('拒绝缺少必要字段的计划草案', () => {
    expect(
      isAiGeneratedPlan({
        days: [],
        title: '缺少 summary',
      }),
    ).toBe(false)
  })

  it('允许前后端共享 AI 请求类型', () => {
    const request: AiChatRequest = {
      messages: [{ content: '帮我生成计划', role: 'user' }],
      mode: 'plan',
    }

    expect(request.mode).toBe('plan')
  })
})
