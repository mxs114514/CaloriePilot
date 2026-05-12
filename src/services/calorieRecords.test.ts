import { describe, expect, it } from 'vitest'

import type { CalorieRecord } from '@/types'

import {
  addMealCaloriesToRecords,
  buildDailyMealCaloriesFromRecords,
  replaceDailyMealCaloriesInRecords,
} from './calorieRecords'

describe('calorie record service', () => {
  const baseRecord: Omit<CalorieRecord, 'calories' | 'id' | 'mealType'> = {
    createdAt: '2026-05-12T08:00:00.000Z',
    date: '2026-05-12',
    planId: 'plan-a',
    updatedAt: '2026-05-12T08:00:00.000Z',
  }

  it('builds daily meal calories from records of the selected plan and date', () => {
    const records: CalorieRecord[] = [
      { ...baseRecord, id: '1', mealType: 'breakfast', calories: 300 },
      { ...baseRecord, id: '2', mealType: 'lunch', calories: 600 },
      { ...baseRecord, id: '3', planId: 'plan-b', mealType: 'lunch', calories: 900 },
      { ...baseRecord, id: '4', date: '2026-05-13', mealType: 'dinner', calories: 500 },
    ]

    expect(buildDailyMealCaloriesFromRecords(records, 'plan-a', '2026-05-12')).toEqual({
      breakfast: 300,
      dinner: 0,
      lunch: 600,
      snack: 0,
    })
  })

  it('adds calories to an existing meal record', () => {
    const records: CalorieRecord[] = [
      { ...baseRecord, id: 'lunch-record', mealType: 'lunch', calories: 600 },
    ]

    const updatedRecords = addMealCaloriesToRecords(records, {
      calories: 250,
      createId: () => 'new-record',
      date: '2026-05-12',
      mealType: 'lunch',
      now: '2026-05-12T12:00:00.000Z',
      planId: 'plan-a',
    })

    expect(updatedRecords).toEqual([
      {
        ...baseRecord,
        id: 'lunch-record',
        mealType: 'lunch',
        calories: 850,
        updatedAt: '2026-05-12T12:00:00.000Z',
      },
    ])
  })

  it('creates a meal record when adding calories for an empty meal', () => {
    const updatedRecords = addMealCaloriesToRecords([], {
      calories: 120,
      createId: () => 'snack-record',
      date: '2026-05-12',
      mealType: 'snack',
      now: '2026-05-12T15:00:00.000Z',
      planId: 'plan-a',
    })

    expect(updatedRecords).toEqual([
      {
        createdAt: '2026-05-12T15:00:00.000Z',
        date: '2026-05-12',
        id: 'snack-record',
        mealType: 'snack',
        calories: 120,
        planId: 'plan-a',
        updatedAt: '2026-05-12T15:00:00.000Z',
      },
    ])
  })

  it('replaces all daily meal calories with one record per meal', () => {
    const records: CalorieRecord[] = [
      { ...baseRecord, id: 'breakfast-record', mealType: 'breakfast', calories: 300 },
      { ...baseRecord, id: 'old-plan-record', planId: 'plan-b', mealType: 'lunch', calories: 900 },
    ]

    const updatedRecords = replaceDailyMealCaloriesInRecords(records, {
      createId: mealType => `${mealType}-new`,
      date: '2026-05-12',
      meals: {
        breakfast: 320,
        dinner: 700,
        lunch: 650,
        snack: 0,
      },
      now: '2026-05-12T20:00:00.000Z',
      planId: 'plan-a',
    })

    expect(updatedRecords).toEqual([
      {
        ...baseRecord,
        id: 'breakfast-record',
        mealType: 'breakfast',
        calories: 320,
        updatedAt: '2026-05-12T20:00:00.000Z',
      },
      { ...baseRecord, id: 'old-plan-record', planId: 'plan-b', mealType: 'lunch', calories: 900 },
      {
        createdAt: '2026-05-12T20:00:00.000Z',
        date: '2026-05-12',
        id: 'lunch-new',
        mealType: 'lunch',
        calories: 650,
        planId: 'plan-a',
        updatedAt: '2026-05-12T20:00:00.000Z',
      },
      {
        createdAt: '2026-05-12T20:00:00.000Z',
        date: '2026-05-12',
        id: 'dinner-new',
        mealType: 'dinner',
        calories: 700,
        planId: 'plan-a',
        updatedAt: '2026-05-12T20:00:00.000Z',
      },
      {
        createdAt: '2026-05-12T20:00:00.000Z',
        date: '2026-05-12',
        id: 'snack-new',
        mealType: 'snack',
        calories: 0,
        planId: 'plan-a',
        updatedAt: '2026-05-12T20:00:00.000Z',
      },
    ])
  })
})
