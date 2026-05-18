import type { DailyPlanHistoryItem } from '@/utils/planHistory'
import type { GoalPlan } from '@/types'

import { describe, expect, it, vi } from 'vitest'

const planHistoryMock = vi.hoisted(() => ({
  getCurrentPlanHistory: vi.fn(),
}))

vi.mock('./planHistory', () => ({
  getCurrentPlanHistory: planHistoryMock.getCurrentPlanHistory,
}))

import { buildAiRecentHistorySummary, getAiRecentHistorySummary } from './aiRecentHistory'

describe('AI 最近历史摘要服务', () => {
  it('在没有热量和体重记录时返回空数据摘要', () => {
    const history: DailyPlanHistoryItem[] = [
      { calories: null, date: '2026-05-10', weightKg: null },
      { calories: null, date: '2026-05-11', weightKg: null },
    ]

    expect(buildAiRecentHistorySummary(history)).toEqual({
      calories: '最近 2 天暂无热量记录。',
      weight: '最近 2 天暂无体重记录。',
    })
  })

  it('基于最近指定天数生成热量和体重摘要', () => {
    const history: DailyPlanHistoryItem[] = [
      { calories: 2000, date: '2026-05-10', weightKg: 73.1 },
      { calories: 1200, date: '2026-05-11', weightKg: 72.4 },
      { calories: null, date: '2026-05-12', weightKg: null },
      { calories: 1800, date: '2026-05-13', weightKg: 71.9 },
    ]

    expect(buildAiRecentHistorySummary(history, 3)).toEqual({
      calories: '最近 3 天有 2 天记录热量，平均摄入 1500 kcal，最高 1800 kcal，最低 1200 kcal。',
      weight: '最近 3 天有 2 天记录体重，从 72.4 kg 到 71.9 kg，下降 0.5 kg。',
    })
  })

  it('从当前计划历史中获取最近记录并生成摘要', async () => {
    const plan: GoalPlan = {
      createdAt: '2026-05-10T08:00:00.000Z',
      dailyCalorieTarget: 1600,
      durationDays: 7,
      id: 'plan-a',
      startDate: '2026-05-10',
      startWeightKg: 72.5,
      status: 'active',
      updatedAt: '2026-05-10T08:00:00.000Z',
      weightLossTargetKg: 2,
    }

    planHistoryMock.getCurrentPlanHistory.mockResolvedValue([
      { calories: 1400, date: '2026-05-12', weightKg: 72.2 },
      { calories: 1600, date: '2026-05-13', weightKg: 72 },
    ])

    await expect(getAiRecentHistorySummary(plan, '2026-05-13')).resolves.toEqual({
      calories: '最近 2 天有 2 天记录热量，平均摄入 1500 kcal，最高 1600 kcal，最低 1400 kcal。',
      weight: '最近 2 天有 2 天记录体重，从 72.2 kg 到 72.0 kg，下降 0.2 kg。',
    })
    expect(planHistoryMock.getCurrentPlanHistory).toHaveBeenCalledWith(plan, '2026-05-13')
  })
})
