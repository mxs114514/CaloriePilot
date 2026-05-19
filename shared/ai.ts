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

export interface AiPlanValidationResult {
  errors: string[]
  success: boolean
}

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

export const validateAiPlanResponse = (value: unknown): AiPlanValidationResult => {
  if (!isRecord(value)) return invalid('响应必须是 JSON 对象')

  if (value.type === 'plan_draft') {
    const errors = validateAiGeneratedPlan(value.plan, 'plan')

    return {
      errors,
      success: errors.length === 0,
    }
  }

  if (value.type === 'needs_clarification') {
    const errors = validateAiPlanNeedsClarificationResponse(value)

    return {
      errors,
      success: errors.length === 0,
    }
  }

  return invalid('type 必须是 plan_draft 或 needs_clarification')
}

export const isAiPlanDraftResponse = (value: unknown): value is AiPlanDraftResponse =>
  validateAiPlanResponse(value).success && isRecord(value) && value.type === 'plan_draft'

export const isAiPlanNeedsClarificationResponse = (
  value: unknown,
): value is AiPlanNeedsClarificationResponse => {
  return (
    validateAiPlanResponse(value).success &&
    isRecord(value) &&
    value.type === 'needs_clarification'
  )
}

export const isAiGeneratedPlan = (value: unknown): value is AiGeneratedPlan => {
  return validateAiGeneratedPlan(value, 'plan').length === 0
}

const validateAiPlanNeedsClarificationResponse = (
  value: Record<string, unknown>,
): string[] => {
  const errors: string[] = []

  if (!isStringInRange(value.message, 1, 200)) {
    errors.push('message 必须是 1 到 200 个字符的字符串')
  }
  if (!isArrayOfAllowedValues(value.missingFields, clarificationFields)) {
    errors.push('missingFields 只能包含 durationDays、startDate 或 goal')
  }
  if (!isArrayOfAllowedValues(value.reasons, invalidPlanRequestReasons)) {
    errors.push('reasons 包含不支持的原因')
  }

  return errors
}

const validateAiGeneratedPlan = (value: unknown, path: string): string[] => {
  const errors: string[] = []

  if (!isRecord(value)) return [`${path} 必须是对象`]
  const { days, durationDays, goal, startDate, title } = value

  if (!isStringInRange(title, 1, 40)) {
    errors.push(`${path}.title 必须是 1 到 40 个字符的字符串`)
  }
  if (!isStringInRange(goal, 1, 20)) {
    errors.push(`${path}.goal 必须是 1 到 20 个字符的字符串`)
  }
  if (!isDateString(startDate)) {
    errors.push(`${path}.startDate 必须是 YYYY-MM-DD 格式`)
  }
  if (!isIntegerInRange(durationDays, 1, 30)) {
    errors.push(`${path}.durationDays 必须是 1 到 30 的整数`)
  }
  if (typeof title === 'string' && typeof goal === 'string' && typeof durationDays === 'number') {
    if (!title.includes(String(durationDays)) || !title.includes(goal)) {
      errors.push(`${path}.title 必须包含天数和目标方向`)
    }
  }
  if (!Array.isArray(days)) {
    errors.push(`${path}.days 必须是数组`)
  } else if (typeof durationDays === 'number' && days.length !== durationDays) {
    errors.push(`${path}.days.length 必须等于 durationDays`)
  }

  if (Array.isArray(days)) {
    days.forEach((day, index) => {
      errors.push(...validateAiGeneratedPlanDay(day, index + 1, `${path}.days[${index}]`))
    })
  }

  return errors
}

const validateAiGeneratedPlanDay = (
  value: unknown,
  expectedDayIndex: number,
  path: string,
): string[] => {
  const errors: string[] = []

  if (!isRecord(value)) return [`${path} 必须是对象`]
  if (value.dayIndex !== expectedDayIndex) {
    errors.push(`${path}.dayIndex 必须等于 ${expectedDayIndex}`)
  }
  if (!Array.isArray(value.meals)) {
    errors.push(`${path}.meals 必须是数组`)
  } else {
    if (value.meals.length < 3) {
      errors.push(`${path}.meals 长度至少为 3`)
    }
    errors.push(...validateMealOrder(value.meals, path))
    value.meals.forEach((meal, index) => {
      errors.push(...validateAiGeneratedMeal(meal, `${path}.meals[${index}]`))
    })
  }
  if (!Array.isArray(value.workouts)) {
    errors.push(`${path}.workouts 必须是数组`)
  } else {
    value.workouts.forEach((workout, index) => {
      errors.push(...validateAiGeneratedWorkout(workout, `${path}.workouts[${index}]`))
    })
  }

  return errors
}

const isAiGeneratedMeal = (value: unknown): value is AiGeneratedMeal => {
  return validateAiGeneratedMeal(value, 'meal').length === 0
}

const validateAiGeneratedMeal = (value: unknown, path: string): string[] => {
  const errors: string[] = []

  if (!isRecord(value)) return [`${path} 必须是对象`]
  if (!isAllowedValue(value.mealType, mealTypes)) {
    errors.push(`${path}.mealType 必须是 breakfast、lunch、dinner 或 snack`)
  }
  if (!isStringInRange(value.title, 1, 30)) {
    errors.push(`${path}.title 必须是 1 到 30 个字符的字符串`)
  }
  if (!isStringInRange(value.description, 1, 120)) {
    errors.push(`${path}.description 必须是 1 到 120 个字符的字符串`)
  }
  if (!isIntegerInRange(value.calories, 50, 2000)) {
    errors.push(`${path}.calories 必须是 50 到 2000 的整数`)
  }

  return errors
}

const isAiGeneratedWorkout = (value: unknown): value is AiGeneratedWorkout => {
  return validateAiGeneratedWorkout(value, 'workout').length === 0
}

const validateAiGeneratedWorkout = (value: unknown, path: string): string[] => {
  const errors: string[] = []

  if (!isRecord(value)) return [`${path} 必须是对象`]
  if (!isStringInRange(value.title, 1, 30)) {
    errors.push(`${path}.title 必须是 1 到 30 个字符的字符串`)
  }
  if (!isStringInRange(value.description, 1, 120)) {
    errors.push(`${path}.description 必须是 1 到 120 个字符的字符串`)
  }
  if (!isIntegerInRange(value.durationMinutes, 1, 300)) {
    errors.push(`${path}.durationMinutes 必须是 1 到 300 的整数`)
  }
  if (!isIntegerInRange(value.caloriesBurned, 1, 2000)) {
    errors.push(`${path}.caloriesBurned 必须是 1 到 2000 的整数`)
  }

  return errors
}

const validateMealOrder = (meals: unknown[], path: string) => {
  const errors: string[] = []
  const mealTypeValues = meals.map(meal =>
    isRecord(meal) && typeof meal.mealType === 'string' ? meal.mealType : '',
  )

  if (!requiredMealOrder.every((mealType, index) => mealTypeValues[index] === mealType)) {
    errors.push(`${path}.meals 前三餐必须按 breakfast、lunch、dinner 排列`)
  }
  if (!mealTypeValues.slice(3).every(mealType => mealType === 'snack')) {
    errors.push(`${path}.meals 中 snack 必须排在三餐后`)
  }

  return errors
}

const invalid = (message: string): AiPlanValidationResult => {
  return {
    errors: [message],
    success: false,
  }
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
