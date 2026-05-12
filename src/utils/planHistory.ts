import type { CalorieRecord, DateString, WeightRecord } from '@/types'

export interface DailyCalorieIntake {
  date: DateString
  calories: number
}

export interface DailyWeightRecord {
  date: DateString
  weightKg: number
}

export const buildDailyCalorieIntakes = (
  records: CalorieRecord[],
  planId: string,
): DailyCalorieIntake[] => {
  const caloriesByDate = new Map<DateString, number>()

  for (const record of records) {
    if (record.planId !== planId) continue

    caloriesByDate.set(record.date, (caloriesByDate.get(record.date) ?? 0) + record.calories)
  }

  return Array.from(caloriesByDate.entries())
    .map(([date, calories]) => ({ date, calories }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export const buildDailyWeightRecords = (
  records: WeightRecord[],
  planId: string,
): DailyWeightRecord[] => {
  const latestRecordByDate = new Map<DateString, WeightRecord>()

  for (const record of records) {
    if (record.planId !== planId) continue

    const currentRecord = latestRecordByDate.get(record.date)

    if (!currentRecord || getRecordTimestamp(record) >= getRecordTimestamp(currentRecord)) {
      latestRecordByDate.set(record.date, record)
    }
  }

  return Array.from(latestRecordByDate.values())
    .map(({ date, weightKg }) => ({ date, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

const getRecordTimestamp = (record: WeightRecord) =>
  new Date(record.updatedAt || record.createdAt).getTime()
