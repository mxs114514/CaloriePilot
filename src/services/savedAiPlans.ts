import type {
  AiGeneratedPlan,
  AiGeneratedWorkout,
  DateString,
  DateTimeString,
  SavedAiPlan,
  SavedMeal,
  SavedMealType,
  SavedPlanDay,
  SavedPlanStatus,
  SavedWorkout,
} from '@/types'

import { db } from '@/db'

export interface SavedAiPlanRuntime {
  createId?: () => string
  getNow?: () => DateTimeString
  getToday?: () => DateString
}

export interface AddSavedMealInput {
  calories: number
  description: string
  mealType?: SavedMealType
  title: string
}

export interface UpdateSavedMealInput {
  calories?: number
  description?: string
  title?: string
}

export interface AddSavedWorkoutInput {
  caloriesBurned: number
  description: string
  durationMinutes: number
  title: string
}

export interface UpdateSavedWorkoutInput {
  caloriesBurned?: number
  description?: string
  durationMinutes?: number
  title?: string
}

export const buildSavedAiPlanFromDraft = (
  draft: AiGeneratedPlan,
  runtime: SavedAiPlanRuntime = {},
): SavedAiPlan => {
  const createId = runtime.createId ?? (() => crypto.randomUUID())
  const today = runtime.getToday?.() ?? getLocalDateString()
  const planId = createId()

  return {
    days: draft.days.map(day => ({
      dayIndex: day.dayIndex,
      meals: day.meals.map(meal => ({
        calories: meal.calories,
        description: meal.description,
        id: createId(),
        isCompleted: false,
        mealType: meal.mealType,
        source: 'ai',
        title: meal.title,
      })),
      workouts: day.workouts.map(workout => buildSavedWorkout(workout, createId())),
    })),
    durationDays: draft.durationDays,
    goal: draft.goal,
    id: planId,
    startDate: draft.startDate,
    status: getInitialPlanStatus(draft.startDate, today),
    title: draft.title,
  }
}

export const saveAiPlanDraft = async (
  draft: AiGeneratedPlan,
  runtime: SavedAiPlanRuntime = {},
) => {
  const today = runtime.getToday?.() ?? getLocalDateString()

  if (draft.startDate.localeCompare(today) < 0) {
    throw new RangeError('新计划开始日期不能早于今天')
  }

  const plan = buildSavedAiPlanFromDraft(draft, {
    ...runtime,
    getToday: () => today,
  })
  const existingPlans = await db.savedAiPlans.toArray()

  await db.transaction('rw', db.savedAiPlans, async () => {
    for (const existingPlan of existingPlans) {
      if (existingPlan.status === 'active' || existingPlan.status === 'pending') {
        await db.savedAiPlans.put({
          ...existingPlan,
          status: 'archived',
        })
      }
    }

    await db.savedAiPlans.add(plan)
  })

  return plan
}

export const getCurrentOrPendingSavedAiPlan = async (today = getLocalDateString()) => {
  const plans = await db.savedAiPlans.toArray()
  const refreshedPlans = plans.map(plan => refreshSavedPlanStatus(plan, today))

  await db.transaction('rw', db.savedAiPlans, async () => {
    for (const plan of refreshedPlans) {
      const original = plans.find(item => item.id === plan.id)
      if (original && original.status !== plan.status) {
        await db.savedAiPlans.put(plan)
      }
    }
  })

  const activePlan = refreshedPlans
    .filter(plan => plan.status === 'active')
    .sort(compareByStartDate)[0]

  if (activePlan) return activePlan

  return refreshedPlans
    .filter(plan => plan.status === 'pending')
    .sort(compareByStartDate)[0] ?? null
}

export const refreshSavedPlanStatus = (
  plan: SavedAiPlan,
  today = getLocalDateString(),
): SavedAiPlan => {
  if (plan.status === 'archived') return plan

  const endDate = addDays(plan.startDate, plan.durationDays - 1)

  if (today.localeCompare(endDate) > 0) {
    return {
      ...plan,
      status: 'completed',
    }
  }

  if (today.localeCompare(plan.startDate) >= 0) {
    return {
      ...plan,
      status: 'active',
    }
  }

  return {
    ...plan,
    status: 'pending',
  }
}

export const calculatePlanCompletionStats = (plan: SavedAiPlan) => {
  const totalCount = plan.days.reduce(
    (total, day) => total + day.meals.length + day.workouts.length,
    0,
  )
  const completedCount = plan.days.reduce(
    (total, day) =>
      total +
      day.meals.filter(item => item.isCompleted).length +
      day.workouts.filter(item => item.isCompleted).length,
    0,
  )

  return {
    completedCount,
    completionRate: totalCount === 0 ? 0 : completedCount / totalCount,
    totalCount,
  }
}

export const toggleSavedMealCompletion = async (
  planId: string,
  dayIndex: number,
  mealId: string,
  runtime: Pick<SavedAiPlanRuntime, 'getNow'> = {},
) => {
  const plan = await requireSavedPlan(planId)
  const day = requireSavedDay(plan, dayIndex)
  const meal = requireSavedMeal(day, mealId)
  const isCompleted = !meal.isCompleted

  Object.assign(meal, {
    completedAt: isCompleted ? getNow(runtime) : undefined,
    isCompleted,
  })

  await db.savedAiPlans.put(plan)

  return isCompleted
}

export const toggleSavedWorkoutCompletion = async (
  planId: string,
  dayIndex: number,
  workoutId: string,
  runtime: Pick<SavedAiPlanRuntime, 'getNow'> = {},
) => {
  const plan = await requireSavedPlan(planId)
  const day = requireSavedDay(plan, dayIndex)
  const workout = requireSavedWorkout(day, workoutId)
  const isCompleted = !workout.isCompleted

  Object.assign(workout, {
    completedAt: isCompleted ? getNow(runtime) : undefined,
    isCompleted,
  })

  await db.savedAiPlans.put(plan)

  return isCompleted
}

export const addSavedMeal = async (
  planId: string,
  dayIndex: number,
  input: AddSavedMealInput,
  runtime: Pick<SavedAiPlanRuntime, 'createId'> = {},
) => {
  const plan = await requireSavedPlan(planId)
  const day = requireSavedDay(plan, dayIndex)
  const mealType = input.mealType ?? 'snack'

  assertMealCanBeAdded(day, mealType)

  const meal: SavedMeal = {
    calories: input.calories,
    description: input.description,
    id: runtime.createId?.() ?? crypto.randomUUID(),
    isCompleted: false,
    mealType,
    source: 'manual',
    title: input.title,
  }

  day.meals.push(meal)
  await db.savedAiPlans.put(plan)

  return meal
}

export const updateSavedMeal = async (
  planId: string,
  dayIndex: number,
  mealId: string,
  input: UpdateSavedMealInput,
) => {
  const plan = await requireSavedPlan(planId)
  const meal = requireSavedMeal(requireSavedDay(plan, dayIndex), mealId)

  Object.assign(meal, input)
  await db.savedAiPlans.put(plan)

  return meal
}

export const deleteSavedMeal = async (planId: string, dayIndex: number, mealId: string) => {
  const plan = await requireSavedPlan(planId)
  const day = requireSavedDay(plan, dayIndex)
  day.meals = day.meals.filter(meal => meal.id !== mealId)

  await db.savedAiPlans.put(plan)
}

export const addSavedWorkout = async (
  planId: string,
  dayIndex: number,
  input: AddSavedWorkoutInput,
  runtime: Pick<SavedAiPlanRuntime, 'createId'> = {},
) => {
  const plan = await requireSavedPlan(planId)
  const day = requireSavedDay(plan, dayIndex)
  const workout: SavedWorkout = {
    caloriesBurned: input.caloriesBurned,
    description: input.description,
    durationMinutes: input.durationMinutes,
    id: runtime.createId?.() ?? crypto.randomUUID(),
    isCompleted: false,
    source: 'manual',
    title: input.title,
  }

  day.workouts.push(workout)
  await db.savedAiPlans.put(plan)

  return workout
}

export const updateSavedWorkout = async (
  planId: string,
  dayIndex: number,
  workoutId: string,
  input: UpdateSavedWorkoutInput,
) => {
  const plan = await requireSavedPlan(planId)
  const workout = requireSavedWorkout(requireSavedDay(plan, dayIndex), workoutId)

  Object.assign(workout, input)
  await db.savedAiPlans.put(plan)

  return workout
}

export const deleteSavedWorkout = async (
  planId: string,
  dayIndex: number,
  workoutId: string,
) => {
  const plan = await requireSavedPlan(planId)
  const day = requireSavedDay(plan, dayIndex)
  day.workouts = day.workouts.filter(workout => workout.id !== workoutId)

  await db.savedAiPlans.put(plan)
}

const buildSavedWorkout = (
  workout: AiGeneratedWorkout,
  id: string,
): SavedWorkout => ({
  caloriesBurned: workout.caloriesBurned,
  description: workout.description,
  durationMinutes: workout.durationMinutes,
  id,
  isCompleted: false,
  source: 'ai',
  title: workout.title,
})

const getInitialPlanStatus = (startDate: DateString, today: DateString): SavedPlanStatus =>
  startDate === today ? 'active' : 'pending'

const assertMealCanBeAdded = (day: SavedPlanDay, mealType: SavedMealType) => {
  if (mealType === 'snack') return
  if (!day.meals.some(meal => meal.mealType === mealType)) return

  throw new RangeError(`每天 ${mealType} 最多只能有一条`)
}

const requireSavedPlan = async (planId: string) => {
  const plan = (await db.savedAiPlans.toArray()).find(item => item.id === planId)
  if (!plan) throw new Error('保存后计划不存在')

  return clonePlan(plan)
}

const requireSavedDay = (plan: SavedAiPlan, dayIndex: number) => {
  const day = plan.days.find(item => item.dayIndex === dayIndex)
  if (!day) throw new Error('计划日期不存在')

  return day
}

const requireSavedMeal = (day: SavedPlanDay, mealId: string) => {
  const meal = day.meals.find(item => item.id === mealId)
  if (!meal) throw new Error('饮食条目不存在')

  return meal
}

const requireSavedWorkout = (day: SavedPlanDay, workoutId: string) => {
  const workout = day.workouts.find(item => item.id === workoutId)
  if (!workout) throw new Error('运动条目不存在')

  return workout
}

const clonePlan = (plan: SavedAiPlan): SavedAiPlan => ({
  ...plan,
  days: plan.days.map(day => ({
    ...day,
    meals: day.meals.map(meal => ({ ...meal })),
    workouts: day.workouts.map(workout => ({ ...workout })),
  })),
})

const compareByStartDate = (left: SavedAiPlan, right: SavedAiPlan) =>
  left.startDate.localeCompare(right.startDate)

const getNow = (runtime: Pick<SavedAiPlanRuntime, 'getNow'>) =>
  runtime.getNow?.() ?? new Date().toISOString()

const getLocalDateString = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const addDays = (date: DateString, days: number): DateString => {
  const value = new Date(`${date}T00:00:00`)
  value.setDate(value.getDate() + days)

  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
