import type { WeightRecord } from '@/types'

import { describe, expect, it } from 'vitest'

import {
  buildTodayWeightRecordFromRecords,
  replaceDailyWeightInRecords,
} from './weightRecords'

describe('weight record service', () => {
  const baseRecord: Omit<WeightRecord, 'id' | 'weightKg'> = {
    createdAt: '2026-05-12T08:00:00.000Z',
    date: '2026-05-12',
    planId: 'plan-a',
    updatedAt: '2026-05-12T08:00:00.000Z',
  }

  it('uses the latest weight record for the selected plan and date', () => {
    const records: WeightRecord[] = [
      { ...baseRecord, id: 'morning', weightKg: 70.4 },
      {
        ...baseRecord,
        id: 'evening',
        weightKg: 70.1,
        updatedAt: '2026-05-12T20:00:00.000Z',
      },
      { ...baseRecord, id: 'other-plan', planId: 'plan-b', weightKg: 65 },
      { ...baseRecord, id: 'other-date', date: '2026-05-13', weightKg: 69.8 },
    ]

    expect(buildTodayWeightRecordFromRecords(records, 'plan-a', '2026-05-12')).toMatchObject({
      id: 'evening',
      weightKg: 70.1,
    })
  })

  it('creates a daily weight record when none exists for the selected date', () => {
    const updatedRecords = replaceDailyWeightInRecords([], {
      createId: () => 'new-weight',
      date: '2026-05-12',
      now: '2026-05-12T08:00:00.000Z',
      planId: 'plan-a',
      weightKg: 70.2,
    })

    expect(updatedRecords).toEqual([
      {
        createdAt: '2026-05-12T08:00:00.000Z',
        date: '2026-05-12',
        id: 'new-weight',
        planId: 'plan-a',
        updatedAt: '2026-05-12T08:00:00.000Z',
        weightKg: 70.2,
      },
    ])
  })

  it('updates the latest daily weight record without touching other records', () => {
    const records: WeightRecord[] = [
      { ...baseRecord, id: 'morning', weightKg: 70.4 },
      {
        ...baseRecord,
        id: 'evening',
        weightKg: 70.1,
        updatedAt: '2026-05-12T20:00:00.000Z',
      },
      { ...baseRecord, id: 'other-date', date: '2026-05-13', weightKg: 69.8 },
    ]

    const updatedRecords = replaceDailyWeightInRecords(records, {
      createId: () => 'new-weight',
      date: '2026-05-12',
      now: '2026-05-12T21:00:00.000Z',
      planId: 'plan-a',
      weightKg: 70,
    })

    expect(updatedRecords).toEqual([
      { ...baseRecord, id: 'morning', weightKg: 70.4 },
      {
        ...baseRecord,
        id: 'evening',
        weightKg: 70,
        updatedAt: '2026-05-12T21:00:00.000Z',
      },
      { ...baseRecord, id: 'other-date', date: '2026-05-13', weightKg: 69.8 },
    ])
  })
})
