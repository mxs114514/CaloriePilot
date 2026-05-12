import { describe, expect, it } from 'vitest'

import type { CalorieRecord, WeightRecord } from '@/types'

import {
  buildDailyCalorieIntakes,
  buildDailyWeightRecords,
} from './planHistory'

describe('plan history summaries', () => {
  const baseTime = '2026-05-12T08:00:00.000Z'

  it('sums calorie records by date for the selected plan', () => {
    const records: CalorieRecord[] = [
      {
        id: 'calorie-1',
        planId: 'plan-a',
        date: '2026-05-12',
        mealType: 'breakfast',
        calories: 300,
        createdAt: baseTime,
        updatedAt: baseTime,
      },
      {
        id: 'calorie-2',
        planId: 'plan-a',
        date: '2026-05-12',
        mealType: 'lunch',
        calories: 650,
        createdAt: baseTime,
        updatedAt: baseTime,
      },
      {
        id: 'calorie-3',
        planId: 'plan-b',
        date: '2026-05-12',
        mealType: 'dinner',
        calories: 900,
        createdAt: baseTime,
        updatedAt: baseTime,
      },
      {
        id: 'calorie-4',
        planId: 'plan-a',
        date: '2026-05-13',
        mealType: 'snack',
        calories: 120,
        createdAt: baseTime,
        updatedAt: baseTime,
      },
    ]

    expect(buildDailyCalorieIntakes(records, 'plan-a')).toEqual([
      { date: '2026-05-12', calories: 950 },
      { date: '2026-05-13', calories: 120 },
    ])
  })

  it('uses the latest weight record of each date for the selected plan', () => {
    const records: WeightRecord[] = [
      {
        id: 'weight-1',
        planId: 'plan-a',
        date: '2026-05-12',
        weightKg: 72.4,
        createdAt: '2026-05-12T08:00:00.000Z',
        updatedAt: '2026-05-12T08:00:00.000Z',
      },
      {
        id: 'weight-2',
        planId: 'plan-a',
        date: '2026-05-12',
        weightKg: 72.1,
        createdAt: '2026-05-12T21:00:00.000Z',
        updatedAt: '2026-05-12T21:00:00.000Z',
      },
      {
        id: 'weight-3',
        planId: 'plan-b',
        date: '2026-05-12',
        weightKg: 66.8,
        createdAt: '2026-05-12T22:00:00.000Z',
        updatedAt: '2026-05-12T22:00:00.000Z',
      },
      {
        id: 'weight-4',
        planId: 'plan-a',
        date: '2026-05-13',
        weightKg: 71.9,
        createdAt: '2026-05-13T07:00:00.000Z',
        updatedAt: '2026-05-13T07:00:00.000Z',
      },
    ]

    expect(buildDailyWeightRecords(records, 'plan-a')).toEqual([
      { date: '2026-05-12', weightKg: 72.1 },
      { date: '2026-05-13', weightKg: 71.9 },
    ])
  })
})
