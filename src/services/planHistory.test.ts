import type { CalorieRecord, GoalPlan, WeightRecord } from '@/types'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => {
  let calorieRecords: CalorieRecord[] = []
  let weightRecords: WeightRecord[] = []

  const makeTable = <T extends { planId: string }>(getRecords: () => T[]) => ({
    where: vi.fn(() => ({
      equals: vi.fn((planId: string) => ({
        toArray: vi.fn(() => Promise.resolve(getRecords().filter(record => record.planId === planId))),
      })),
    })),
  })

  return {
    db: {
      calorieRecords: makeTable(() => calorieRecords),
      weightRecords: makeTable(() => weightRecords),
    },
    setRecords: (nextCalorieRecords: CalorieRecord[], nextWeightRecords: WeightRecord[]) => {
      calorieRecords = nextCalorieRecords
      weightRecords = nextWeightRecords
    },
  }
})

vi.mock('@/db', () => ({
  db: dbMock.db,
}))

import { getCurrentPlanHistory } from './planHistory'

describe('plan history service', () => {
  const plan: GoalPlan = {
    createdAt: '2026-05-10T08:00:00.000Z',
    dailyCalorieTarget: 1600,
    durationDays: 4,
    id: 'plan-a',
    startDate: '2026-05-10',
    startWeightKg: 72.5,
    status: 'active',
    updatedAt: '2026-05-10T08:00:00.000Z',
    weightLossTargetKg: 2,
  }

  beforeEach(() => {
    dbMock.setRecords([], [])
  })

  it('returns current plan daily history with empty dates preserved', async () => {
    const baseTime = '2026-05-11T08:00:00.000Z'

    dbMock.setRecords(
      [
        {
          calories: 300,
          createdAt: baseTime,
          date: '2026-05-11',
          id: 'breakfast',
          mealType: 'breakfast',
          planId: 'plan-a',
          updatedAt: baseTime,
        },
        {
          calories: 700,
          createdAt: baseTime,
          date: '2026-05-11',
          id: 'lunch',
          mealType: 'lunch',
          planId: 'plan-a',
          updatedAt: baseTime,
        },
        {
          calories: 999,
          createdAt: baseTime,
          date: '2026-05-11',
          id: 'other-plan',
          mealType: 'dinner',
          planId: 'plan-b',
          updatedAt: baseTime,
        },
      ],
      [
        {
          createdAt: '2026-05-11T08:00:00.000Z',
          date: '2026-05-11',
          id: 'morning',
          planId: 'plan-a',
          updatedAt: '2026-05-11T08:00:00.000Z',
          weightKg: 72.3,
        },
        {
          createdAt: '2026-05-11T21:00:00.000Z',
          date: '2026-05-11',
          id: 'evening',
          planId: 'plan-a',
          updatedAt: '2026-05-11T21:00:00.000Z',
          weightKg: 72.1,
        },
        {
          createdAt: '2026-05-12T08:00:00.000Z',
          date: '2026-05-12',
          id: 'other-plan-weight',
          planId: 'plan-b',
          updatedAt: '2026-05-12T08:00:00.000Z',
          weightKg: 65,
        },
      ],
    )

    await expect(getCurrentPlanHistory(plan, '2026-05-13')).resolves.toEqual([
      { calories: null, date: '2026-05-10', weightKg: null },
      { calories: 1000, date: '2026-05-11', weightKg: 72.1 },
      { calories: null, date: '2026-05-12', weightKg: null },
      { calories: null, date: '2026-05-13', weightKg: null },
    ])
  })
})
