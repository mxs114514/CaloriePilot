import type { DateString, GoalPlan } from '@/types'
import type { DailyPlanHistoryItem } from '@/utils/planHistory'

import { getCurrentPlanHistory } from './planHistory'

export interface AiRecentHistorySummary {
  calories: string
  weight: string
}

export const getAiRecentHistorySummary = async (
  plan: GoalPlan,
  today?: DateString,
  maxDays = 7,
): Promise<AiRecentHistorySummary> => {
  const history = await getCurrentPlanHistory(plan, today)

  return buildAiRecentHistorySummary(history, maxDays)
}

export const buildAiRecentHistorySummary = (
  history: DailyPlanHistoryItem[],
  maxDays = 7,
): AiRecentHistorySummary => {
  const recentHistory = history.slice(-maxDays)
  const dayCount = recentHistory.length
  const calorieValues = recentHistory
    .map(item => item.calories)
    .filter((calories): calories is number => calories !== null)
  const weightValues = recentHistory
    .map(item => item.weightKg)
    .filter((weightKg): weightKg is number => weightKg !== null)

  return {
    calories: buildCalorieSummary(calorieValues, dayCount),
    weight: buildWeightSummary(weightValues, dayCount),
  }
}

const buildCalorieSummary = (calories: number[], dayCount: number) => {
  if (calories.length === 0) {
    return `最近 ${dayCount} 天暂无热量记录。`
  }

  const average = Math.round(sum(calories) / calories.length)
  const max = Math.max(...calories)
  const min = Math.min(...calories)

  return `最近 ${dayCount} 天有 ${calories.length} 天记录热量，平均摄入 ${average} kcal，最高 ${max} kcal，最低 ${min} kcal。`
}

const buildWeightSummary = (weights: number[], dayCount: number) => {
  if (weights.length === 0) {
    return `最近 ${dayCount} 天暂无体重记录。`
  }

  const firstWeight = weights[0]!
  const latestWeight = weights[weights.length - 1]!
  const change = latestWeight - firstWeight
  const direction = getWeightChangeDirection(change)

  return `最近 ${dayCount} 天有 ${weights.length} 天记录体重，从 ${formatWeight(firstWeight)} kg 到 ${formatWeight(latestWeight)} kg，${direction} ${formatWeight(Math.abs(change))} kg。`
}

const getWeightChangeDirection = (change: number) => {
  if (change > 0) return '上升'
  if (change < 0) return '下降'

  return '持平'
}

const formatWeight = (weightKg: number) => weightKg.toFixed(1)

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
