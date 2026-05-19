import type { DateString, GoalPlan, UserProfile } from './models'

export interface AiChatMessage {
  content: string
  role: 'assistant' | 'user'
}

export type PlanClarificationField = 'durationDays' | 'startDate' | 'goal'

export type InvalidPlanRequestReason =
  | 'ambiguous_duration'
  | 'ambiguous_start_date'
  | 'duration_exceeds_limit'
  | 'long_duration_confirmation_required'
  | 'start_date_before_today'

export type AiMealType = 'breakfast' | 'dinner' | 'lunch' | 'snack'

export interface AiGeneratedMeal {
  calories: number
  description: string
  mealType: AiMealType
  title: string
}

export interface AiGeneratedWorkout {
  caloriesBurned: number
  description: string
  durationMinutes: number
  title: string
}

export interface AiGeneratedPlanDay {
  dayIndex: number
  meals: AiGeneratedMeal[]
  workouts: AiGeneratedWorkout[]
}

export interface AiGeneratedPlan {
  days: AiGeneratedPlanDay[]
  durationDays: number
  goal: string
  startDate: DateString
  title: string
}

export interface AiPlanDraftResponse {
  plan: AiGeneratedPlan
  type: 'plan_draft'
}

export interface AiPlanNeedsClarificationResponse {
  message: string
  missingFields: PlanClarificationField[]
  reasons: InvalidPlanRequestReason[]
  type: 'needs_clarification'
}

export interface AiChatRequest {
  activePlan?: GoalPlan
  draftPlan?: AiGeneratedPlan
  messages: AiChatMessage[]
  mode: 'chat' | 'plan'
  profile?: UserProfile
  recentHistory?: AiRecentHistory
}

export interface AiRecentHistory {
  calories?: string
  weight?: string
}

export type AiChatResponse =
  | { content: string; type: 'message' }
  | AiPlanDraftResponse
  | AiPlanNeedsClarificationResponse

const mealTypes: AiMealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const requiredMealOrder: AiMealType[] = ['breakfast', 'lunch', 'dinner']
const clarificationFields: PlanClarificationField[] = ['durationDays', 'startDate', 'goal']
const invalidPlanRequestReasons: InvalidPlanRequestReason[] = [
  'duration_exceeds_limit',
  'long_duration_confirmation_required',
  'start_date_before_today',
  'ambiguous_start_date',
  'ambiguous_duration',
]

export const isAiPlanDraftResponse = (value: unknown): value is AiPlanDraftResponse =>
  isRecord(value) && value.type === 'plan_draft' && isAiGeneratedPlan(value.plan)

export const isAiPlanNeedsClarificationResponse = (
  value: unknown,
): value is AiPlanNeedsClarificationResponse => {
  if (!isRecord(value)) return false
  if (value.type !== 'needs_clarification') return false
  if (!isStringInRange(value.message, 1, 200)) return false
  if (!isArrayOfAllowedValues(value.missingFields, clarificationFields)) return false

  return isArrayOfAllowedValues(value.reasons, invalidPlanRequestReasons)
}

export const isAiGeneratedPlan = (value: unknown): value is AiGeneratedPlan => {
  if (!isRecord(value)) return false
  const { days, durationDays, goal, startDate, title } = value

  if (!isStringInRange(title, 1, 40)) return false
  if (!isStringInRange(goal, 1, 20)) return false
  if (!isDateString(startDate)) return false
  if (!isIntegerInRange(durationDays, 1, 30)) return false
  if (!title.includes(String(durationDays)) || !title.includes(goal)) {
    return false
  }
  if (!Array.isArray(days) || days.length !== durationDays) return false

  return days.every((day, index) => isAiGeneratedPlanDay(day, index + 1))
}

const isAiGeneratedPlanDay = (
  value: unknown,
  expectedDayIndex: number,
): value is AiGeneratedPlanDay => {
  if (!isRecord(value)) return false
  if (value.dayIndex !== expectedDayIndex) return false
  if (!Array.isArray(value.meals) || value.meals.length < 3) return false
  if (!Array.isArray(value.workouts)) return false
  if (!hasValidMealOrder(value.meals)) return false

  return value.meals.every(isAiGeneratedMeal) && value.workouts.every(isAiGeneratedWorkout)
}

const isAiGeneratedMeal = (value: unknown): value is AiGeneratedMeal => {
  if (!isRecord(value)) return false

  return (
    isAllowedValue(value.mealType, mealTypes) &&
    isStringInRange(value.title, 1, 30) &&
    isStringInRange(value.description, 1, 120) &&
    isIntegerInRange(value.calories, 50, 2000)
  )
}

const isAiGeneratedWorkout = (value: unknown): value is AiGeneratedWorkout => {
  if (!isRecord(value)) return false

  return (
    isStringInRange(value.title, 1, 30) &&
    isStringInRange(value.description, 1, 120) &&
    isIntegerInRange(value.durationMinutes, 1, 300) &&
    isIntegerInRange(value.caloriesBurned, 1, 2000)
  )
}

const hasValidMealOrder = (meals: unknown[]) => {
  const mealTypeValues = meals.map(meal =>
    isRecord(meal) && typeof meal.mealType === 'string' ? meal.mealType : '',
  )

  if (!requiredMealOrder.every((mealType, index) => mealTypeValues[index] === mealType)) {
    return false
  }

  return mealTypeValues.slice(3).every(mealType => mealType === 'snack')
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isDateString = (value: unknown): value is DateString =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

const isIntegerInRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max

const isStringInRange = (value: unknown, min: number, max: number): value is string =>
  typeof value === 'string' && value.length >= min && value.length <= max

const isAllowedValue = <T extends string>(value: unknown, allowedValues: T[]): value is T =>
  typeof value === 'string' && allowedValues.includes(value as T)

const isArrayOfAllowedValues = <T extends string>(
  value: unknown,
  allowedValues: T[],
): value is T[] => Array.isArray(value) && value.every(item => isAllowedValue(item, allowedValues))
