import { describe, expect, it } from 'vitest'

import type { CalorieRecord, GoalPlan, WeightRecord } from '@/types'

import {
  buildDailyPlanHistoryItems,
  buildDailyCalorieIntakes,
  buildDailyWeightRecords,
  enumerateDates,
  getActivePlanHistoryRange,
  getPlannedEndDate,
} from './planHistory'

describe('plan history summaries', () => {
  const baseTime = '2026-05-12T08:00:00.000Z'
  const basePlan: GoalPlan = {
    createdAt: '2026-05-10T08:00:00.000Z',
    dailyCalorieTarget: 1600,
    durationDays: 5,
    id: 'plan-a',
    startDate: '2026-05-10',
    startWeightKg: 72.5,
    status: 'active',
    updatedAt: '2026-05-10T08:00:00.000Z',
    weightLossTargetKg: 2,
  }

  it('calculates the planned end date from start date and duration', () => {
    expect(getPlannedEndDate(basePlan)).toBe('2026-05-14')
  })

  it('uses today as the current active plan history end date before planned end', () => {
    expect(getActivePlanHistoryRange(basePlan, '2026-05-13')).toEqual({
      endDate: '2026-05-13',
      startDate: '2026-05-10',
    })
  })

  it('uses the planned end date as the active plan history end date after the plan window', () => {
    expect(getActivePlanHistoryRange(basePlan, '2026-05-20')).toEqual({
      endDate: '2026-05-14',
      startDate: '2026-05-10',
    })
  })

  it('enumerates every date in a history range', () => {
    expect(enumerateDates({ endDate: '2026-05-13', startDate: '2026-05-10' })).toEqual([
      '2026-05-10',
      '2026-05-11',
      '2026-05-12',
      '2026-05-13',
    ])
  })

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

  it('combines date range, calorie intakes, and weight records into daily history items', () => {
    expect(
      buildDailyPlanHistoryItems(
        ['2026-05-10', '2026-05-11', '2026-05-12'],
        [
          { calories: 1200, date: '2026-05-11' },
          { calories: 1600, date: '2026-05-12' },
        ],
        [{ date: '2026-05-11', weightKg: 70.2 }],
      ),
    ).toEqual([
      { calories: null, date: '2026-05-10', weightKg: null },
      { calories: 1200, date: '2026-05-11', weightKg: 70.2 },
      { calories: 1600, date: '2026-05-12', weightKg: null },
    ])
  })
})
