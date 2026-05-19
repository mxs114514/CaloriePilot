import type { SavedAiPlan } from '@/types'

import { describe, expect, it } from 'vitest'

describe('保存后 AI 计划服务', () => {
  it('支持构造保存后的 AI 计划模型', () => {
    const plan: SavedAiPlan = {
      days: [],
      durationDays: 7,
      goal: '轻量减脂',
      id: 'saved-plan-a',
      startDate: '2026-05-20',
      status: 'pending',
      title: '7 天轻量减脂计划',
    }

    expect(plan.status).toBe('pending')
  })
})
