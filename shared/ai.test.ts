import { describe, expect, it } from 'vitest'

import {
  isAiGeneratedPlan,
  isAiPlanDraftResponse,
  isAiPlanNeedsClarificationResponse,
  type AiChatRequest,
  type AiGeneratedPlan,
} from './ai'

describe('共享 AI 类型契约', () => {
  const validPlan: AiGeneratedPlan = {
    days: Array.from({ length: 7 }, (_, index) => ({
      dayIndex: index + 1,
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
    })),
    durationDays: 7,
    goal: '轻量减脂',
    startDate: '2026-05-20',
    title: '7 天轻量减脂计划',
  }

  it('校验 AI 返回的计划草案结构', () => {
    expect(isAiGeneratedPlan(validPlan)).toBe(true)
  })

  it('拒绝缺少必要字段的计划草案', () => {
    expect(
      isAiGeneratedPlan({
        days: [],
        durationDays: 1,
        goal: '轻量减脂',
        startDate: '2026-05-20',
        title: '1 天轻量减脂计划',
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

  it('校验符合新计划设计的 AI 草案响应', () => {
    expect(
      isAiPlanDraftResponse({
        type: 'plan_draft',
        plan: {
          days: Array.from({ length: 7 }, (_, index) => ({
            dayIndex: index + 1,
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
          })),
          durationDays: 7,
          goal: '轻量减脂',
          startDate: '2026-05-20',
          title: '7 天轻量减脂计划',
        },
      }),
    ).toBe(true)
  })

  it('拒绝旧版 content、summary、checkins 结构', () => {
    expect(
      isAiPlanDraftResponse({
        content: '已生成计划',
        plan: {
          days: [{ checkins: [], dayIndex: 1, meals: [], workouts: [] }],
          summary: '旧摘要',
          title: '7 天轻量减脂计划',
        },
        type: 'plan_draft',
      }),
    ).toBe(false)
  })

  it('校验 needs_clarification 响应', () => {
    expect(
      isAiPlanNeedsClarificationResponse({
        message: '请告诉我计划天数、开始日期和目标方向。',
        missingFields: ['durationDays', 'startDate', 'goal'],
        reasons: ['ambiguous_duration'],
        type: 'needs_clarification',
      }),
    ).toBe(true)
  })
})
