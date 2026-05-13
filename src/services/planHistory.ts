import type { DateString, GoalPlan } from '@/types'

import { db } from '@/db'
import {
  buildDailyCalorieIntakes,
  buildDailyPlanHistoryItems,
  buildDailyWeightRecords,
  enumerateDates,
  getActivePlanHistoryRange,
} from '@/utils/planHistory'

export const getCurrentPlanHistory = async (plan: GoalPlan, today?: DateString) => {
  const [calorieRecords, weightRecords] = await Promise.all([
    db.calorieRecords.where('planId').equals(plan.id).toArray(),
    db.weightRecords.where('planId').equals(plan.id).toArray(),
  ])
  const range = getActivePlanHistoryRange(plan, today)
  const dates = enumerateDates(range)
  const calorieIntakes = buildDailyCalorieIntakes(calorieRecords, plan.id)
  const dailyWeightRecords = buildDailyWeightRecords(weightRecords, plan.id)

  return buildDailyPlanHistoryItems(dates, calorieIntakes, dailyWeightRecords)
}
