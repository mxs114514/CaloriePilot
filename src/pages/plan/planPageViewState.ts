import type { DateString, SavedAiPlan, SavedMeal, SavedMealType, SavedWorkout } from '@/types'

import { calculatePlanCompletionStats } from '@/services/savedAiPlans'

export interface PlanMealDayView {
  dayIndex: number
  items: PlanMealItemView[]
  totalCalories: number
}

export interface PlanMealItemView extends SavedMeal {
  mealTypeText: string
}

export interface PlanWorkoutDayView {
  dayIndex: number
  items: SavedWorkout[]
  totalCaloriesBurned: number
  totalDurationMinutes: number
}

export interface PlanPageViewState {
  mealDays: PlanMealDayView[]
  summary: {
    completedCount: number
    completionPercent: number
    statusText: string
    subtitle: string
    totalCount: number
  }
  workoutDays: PlanWorkoutDayView[]
}

export const buildPlanPageViewState = (plan: SavedAiPlan): PlanPageViewState => {
  const stats = calculatePlanCompletionStats(plan)

  return {
    mealDays: plan.days.map(day => ({
      dayIndex: day.dayIndex,
      items: day.meals.map(meal => ({
        ...meal,
        mealTypeText: formatMealType(meal.mealType),
      })),
      totalCalories: day.meals.reduce((total, meal) => total + meal.calories, 0),
    })),
    summary: {
      completedCount: stats.completedCount,
      completionPercent: Math.round(stats.completionRate * 100),
      statusText: formatPlanStatus(plan.status),
      subtitle: `${plan.goal} · ${plan.startDate} 开始 · ${plan.durationDays} 天`,
      totalCount: stats.totalCount,
    },
    workoutDays: plan.days.map(day => ({
      dayIndex: day.dayIndex,
      items: day.workouts,
      totalCaloriesBurned: day.workouts.reduce(
        (total, workout) => total + workout.caloriesBurned,
        0,
      ),
      totalDurationMinutes: day.workouts.reduce(
        (total, workout) => total + workout.durationMinutes,
        0,
      ),
    })),
  }
}

export const getDefaultActiveDayNames = (
  plan: SavedAiPlan | null,
  today = getLocalDateString(),
): number[] => {
  if (!plan) return []

  const currentDayIndex = getCurrentDayIndex(plan.startDate, today)

  if (currentDayIndex < 1 || currentDayIndex > plan.durationDays) return [1]

  return [currentDayIndex]
}

export const formatMealType = (mealType: SavedMealType) => {
  if (mealType === 'breakfast') return '早餐'
  if (mealType === 'lunch') return '午餐'
  if (mealType === 'dinner') return '晚餐'

  return '加餐'
}

const formatPlanStatus = (status: SavedAiPlan['status']) => {
  if (status === 'pending') return '待开始'
  if (status === 'completed') return '已完成'
  if (status === 'archived') return '已归档'

  return '进行中'
}

export const updateMealCompletionInPlan = (
  plan: SavedAiPlan,
  dayIndex: number,
  mealId: string,
  isCompleted: boolean,
  completedAt?: DateString | string,
): SavedAiPlan => ({
  ...plan,
  days: plan.days.map(day => {
    if (day.dayIndex !== dayIndex) return day

    return {
      ...day,
      meals: day.meals.map(meal => {
        if (meal.id !== mealId) return meal

        return {
          ...meal,
          completedAt: isCompleted ? completedAt : undefined,
          isCompleted,
        }
      }),
    }
  }),
})

export const updateWorkoutCompletionInPlan = (
  plan: SavedAiPlan,
  dayIndex: number,
  workoutId: string,
  isCompleted: boolean,
  completedAt?: DateString | string,
): SavedAiPlan => ({
  ...plan,
  days: plan.days.map(day => {
    if (day.dayIndex !== dayIndex) return day

    return {
      ...day,
      workouts: day.workouts.map(workout => {
        if (workout.id !== workoutId) return workout

        return {
          ...workout,
          completedAt: isCompleted ? completedAt : undefined,
          isCompleted,
        }
      }),
    }
  }),
})

const getCurrentDayIndex = (startDate: DateString, today: DateString) => {
  const start = new Date(`${startDate}T00:00:00`)
  const current = new Date(`${today}T00:00:00`)
  const millisecondsPerDay = 24 * 60 * 60 * 1000

  return Math.floor((current.getTime() - start.getTime()) / millisecondsPerDay) + 1
}

const getLocalDateString = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
