import type { DateString, UserProfile, WeightRecord } from '@/types'

import { db } from '@/db'
import { updateProfileCurrentWeight } from '@/services/profilePlanning'

interface ReplaceDailyWeightInput {
  createId: () => string
  date: DateString
  now: string
  planId: string
  weightKg: number
}

export const buildTodayWeightRecordFromRecords = (
  records: WeightRecord[],
  planId: string,
  date: DateString,
) => {
  return records
    .filter(record => record.planId === planId && record.date === date)
    .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a))[0]
}

export const replaceDailyWeightInRecords = (
  records: WeightRecord[],
  input: ReplaceDailyWeightInput,
) => {
  const existingRecord = buildTodayWeightRecordFromRecords(records, input.planId, input.date)

  if (!existingRecord) {
    return [
      ...records,
      {
        createdAt: input.now,
        date: input.date,
        id: input.createId(),
        planId: input.planId,
        updatedAt: input.now,
        weightKg: input.weightKg,
      },
    ]
  }

  return records.map(record =>
    record === existingRecord
      ? {
          ...record,
          updatedAt: input.now,
          weightKg: input.weightKg,
        }
      : record,
  )
}

export const getTodayWeightRecord = async (planId: string, date = getLocalDateString()) => {
  const records = await getDailyWeightRecords(planId, date)

  return buildTodayWeightRecordFromRecords(records, planId, date)
}

export const saveTodayWeightRecord = async (
  profile: UserProfile,
  planId: string,
  weightKg: number,
  date = getLocalDateString(),
) => {
  assertPositiveWeight(weightKg)

  const now = new Date().toISOString()
  const records = await getDailyWeightRecords(planId, date)
  const updatedRecords = replaceDailyWeightInRecords(records, {
    createId: () => `${date}-weight-${crypto.randomUUID()}`,
    date,
    now,
    planId,
    weightKg,
  })
  const updatedProfile = updateProfileCurrentWeight(profile, weightKg, {
    getNow: () => now,
  })

  await db.transaction('rw', db.weightRecords, db.profiles, async () => {
    await saveChangedRecords(records, updatedRecords)
    await db.profiles.put(updatedProfile)
  })

  return {
    profile: updatedProfile,
    record: buildTodayWeightRecordFromRecords(updatedRecords, planId, date),
  }
}

const getDailyWeightRecords = (planId: string, date: DateString) =>
  db.weightRecords
    .where('planId')
    .equals(planId)
    .filter(record => record.date === date)
    .toArray()

const saveChangedRecords = async (
  originalRecords: WeightRecord[],
  updatedRecords: WeightRecord[],
) => {
  const changedRecords = updatedRecords.filter(updatedRecord => {
    const originalRecord = originalRecords.find(record => record.id === updatedRecord.id)

    return !originalRecord || JSON.stringify(originalRecord) !== JSON.stringify(updatedRecord)
  })

  if (changedRecords.length > 0) {
    await db.weightRecords.bulkPut(changedRecords)
  }
}

const assertPositiveWeight = (weightKg: number) => {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError('weightKg must be greater than 0')
  }
}

const getRecordTimestamp = (record: WeightRecord) =>
  new Date(record.updatedAt || record.createdAt).getTime()

const getLocalDateString = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
