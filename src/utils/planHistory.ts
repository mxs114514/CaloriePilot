import type { CalorieRecord, DateString, GoalPlan, WeightRecord } from '@/types'

export interface DailyCalorieIntake {
  date: DateString
  calories: number
}

export interface DailyWeightRecord {
  date: DateString
  weightKg: number
}

export interface DailyPlanHistoryItem {
  date: DateString
  calories: number | null
  weightKg: number | null
}

export interface PlanHistoryRange {
  endDate: DateString
  startDate: DateString
}

export const getPlannedEndDate = (plan: GoalPlan): DateString =>
  addDays(plan.startDate, plan.durationDays - 1)

export const getActivePlanHistoryRange = (
  plan: GoalPlan,
  today = getLocalDateString(),
): PlanHistoryRange => {
  const plannedEndDate = getPlannedEndDate(plan)

  return {
    endDate: today.localeCompare(plannedEndDate) < 0 ? today : plannedEndDate,
    startDate: plan.startDate,
  }
}

export const enumerateDates = (range: PlanHistoryRange): DateString[] => {
  const dates: DateString[] = []
  let currentDate = range.startDate

  while (currentDate.localeCompare(range.endDate) <= 0) {
    dates.push(currentDate)
    currentDate = addDays(currentDate, 1)
  }

  return dates
}

export const buildDailyPlanHistoryItems = (
  dates: DateString[],
  calorieIntakes: DailyCalorieIntake[],
  weightRecords: DailyWeightRecord[],
): DailyPlanHistoryItem[] => {
  const caloriesByDate = new Map(calorieIntakes.map(record => [record.date, record.calories]))
  const weightByDate = new Map(weightRecords.map(record => [record.date, record.weightKg]))

  return dates.map(date => ({
    calories: caloriesByDate.get(date) ?? null,
    date,
    weightKg: weightByDate.get(date) ?? null,
  }))
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

export const addDays = (date: DateString, days: number): DateString => {
  const value = new Date(`${date}T00:00:00`)
  value.setDate(value.getDate() + days)

  return formatLocalDate(value)
}

const getLocalDateString = () => formatLocalDate(new Date())

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
