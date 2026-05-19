import type { SavedAiPlan } from '@/types'

import { describe, expect, it } from 'vitest'

import {
  buildPlanPageViewState,
  formatMealType,
  getDefaultActiveDayNames,
  updateMealCompletionInPlan,
  updateWorkoutCompletionInPlan,
} from './planPageViewState'

describe('计划页面派生状态', () => {
  it('把保存后的 AI 计划拆成饮食计划表和运动计划表', () => {
    const state = buildPlanPageViewState(makeSavedPlan())

    expect(state.mealDays).toEqual([
      expect.objectContaining({
        dayIndex: 1,
        items: [
          expect.objectContaining({ id: 'breakfast', mealTypeText: '早餐' }),
          expect.objectContaining({ id: 'lunch', mealTypeText: '午餐' }),
          expect.objectContaining({ id: 'dinner', mealTypeText: '晚餐' }),
        ],
        totalCalories: 1490,
      }),
      expect.objectContaining({
        dayIndex: 2,
        items: [expect.objectContaining({ id: 'snack', mealTypeText: '加餐' })],
        totalCalories: 180,
      }),
    ])
    expect(state.workoutDays).toEqual([
      expect.objectContaining({
        dayIndex: 1,
        items: [expect.objectContaining({ id: 'walk' })],
        totalCaloriesBurned: 160,
        totalDurationMinutes: 30,
      }),
      expect.objectContaining({
        dayIndex: 2,
        items: [],
        totalCaloriesBurned: 0,
        totalDurationMinutes: 0,
      }),
    ])
  })

  it('计算计划摘要和完成进度', () => {
    const state = buildPlanPageViewState(makeSavedPlan())

    expect(state.summary).toEqual({
      completedCount: 2,
      completionPercent: 40,
      statusText: '进行中',
      subtitle: '轻量减脂 · 2026-05-20 开始 · 2 天',
      totalCount: 5,
    })
  })

  it('默认展开当前天，超出范围时展开第 1 天', () => {
    expect(getDefaultActiveDayNames(makeSavedPlan(), '2026-05-21')).toEqual([2])
    expect(getDefaultActiveDayNames(makeSavedPlan(), '2026-05-25')).toEqual([1])
    expect(getDefaultActiveDayNames(null, '2026-05-21')).toEqual([])
  })

  it('格式化用餐类型', () => {
    expect(formatMealType('breakfast')).toBe('早餐')
    expect(formatMealType('lunch')).toBe('午餐')
    expect(formatMealType('dinner')).toBe('晚餐')
    expect(formatMealType('snack')).toBe('加餐')
  })

  it('本地更新饮食完成状态且不修改原计划对象', () => {
    const plan = makeSavedPlan()
    const updatedPlan = updateMealCompletionInPlan(
      plan,
      1,
      'lunch',
      true,
      '2026-05-20T08:00:00.000Z',
    )

    expect(updatedPlan.days[0]?.meals[1]).toMatchObject({
      completedAt: '2026-05-20T08:00:00.000Z',
      id: 'lunch',
      isCompleted: true,
    })
    expect(plan.days[0]?.meals[1]).toMatchObject({
      id: 'lunch',
      isCompleted: false,
    })
    expect(plan.days[0]?.meals[1]).not.toHaveProperty('completedAt')
  })

  it('本地取消运动完成状态时清空完成时间', () => {
    const plan = makeSavedPlan()
    const updatedPlan = updateWorkoutCompletionInPlan(plan, 1, 'walk', false)

    expect(updatedPlan.days[0]?.workouts[0]).toMatchObject({
      completedAt: undefined,
      id: 'walk',
      isCompleted: false,
    })
    expect(plan.days[0]?.workouts[0]).toMatchObject({
      id: 'walk',
      isCompleted: true,
    })
  })
})

const makeSavedPlan = (): SavedAiPlan => ({
  days: [
    {
      dayIndex: 1,
      meals: [
        {
          calories: 420,
          description: '燕麦 40g、鸡蛋 1 个。',
          id: 'breakfast',
          isCompleted: true,
          mealType: 'breakfast',
          source: 'ai',
          title: '燕麦鸡蛋餐',
        },
        {
          calories: 650,
          description: '鸡胸肉 120g、米饭 150g。',
          id: 'lunch',
          isCompleted: false,
          mealType: 'lunch',
          source: 'ai',
          title: '鸡胸肉米饭',
        },
        {
          calories: 420,
          description: '番茄 150g、豆腐 120g。',
          id: 'dinner',
          isCompleted: false,
          mealType: 'dinner',
          source: 'ai',
          title: '番茄豆腐汤',
        },
      ],
      workouts: [
        {
          caloriesBurned: 160,
          description: '保持略微喘气的速度。',
          durationMinutes: 30,
          id: 'walk',
          isCompleted: true,
          source: 'ai',
          title: '快走',
        },
      ],
    },
    {
      dayIndex: 2,
      meals: [
        {
          calories: 180,
          description: '苹果 1 个。',
          id: 'snack',
          isCompleted: false,
          mealType: 'snack',
          source: 'manual',
          title: '苹果加餐',
        },
      ],
      workouts: [],
    },
  ],
  durationDays: 2,
  goal: '轻量减脂',
  id: 'plan-a',
  startDate: '2026-05-20',
  status: 'active',
  title: '2 天轻量减脂计划',
})
