import { describe, expect, it } from 'vitest'

import { isAiGeneratedPlan, type AiChatRequest, type AiGeneratedPlan } from './ai'

describe('AI 对话共享类型', () => {
  const validPlan: AiGeneratedPlan = {
    days: [
      {
        checkins: [],
        dayIndex: 1,
        meals: [],
        workouts: [],
      },
    ],
    summary: '保持温和热量缺口。',
    title: '7 天减重计划',
  }

  it('合法计划可以通过基础校验', () => {
    expect(isAiGeneratedPlan(validPlan)).toBe(true)
  })

  it('缺少 days 时校验失败', () => {
    expect(
      isAiGeneratedPlan({
        summary: '缺少天数。',
        title: '无效计划',
      }),
    ).toBe(false)
  })

  it('空的食谱、训练和习惯数组可以通过校验', () => {
    expect(
      isAiGeneratedPlan({
        days: [{ checkins: [], dayIndex: 1, meals: [], workouts: [] }],
        summary: '今天只做记录。',
        title: '轻量计划',
      }),
    ).toBe(true)
  })

  it('AI 请求可以携带页面内计划草案', () => {
    const request: AiChatRequest = {
      draftPlan: validPlan,
      messages: [{ content: '我想多跑步', role: 'user' }],
      mode: 'plan',
    }

    expect(request.draftPlan?.title).toBe('7 天减重计划')
  })
})
