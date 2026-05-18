import type { DateString, GoalPlan, UserProfile } from './models'

export interface AiChatMessage {
  content: string
  role: 'assistant' | 'user'
}

export interface AiGeneratedMeal {
  calories?: number
  description?: string
  metadata?: Record<string, unknown>
  title: string
}

export interface AiGeneratedWorkout {
  description?: string
  metadata?: Record<string, unknown>
  title: string
}

export interface AiGeneratedCheckin {
  description?: string
  metadata?: Record<string, unknown>
  title: string
}

export interface AiGeneratedPlanDay {
  checkins: AiGeneratedCheckin[]
  date?: DateString
  dayIndex: number
  meals: AiGeneratedMeal[]
  workouts: AiGeneratedWorkout[]
}

export interface AiGeneratedPlan {
  days: AiGeneratedPlanDay[]
  summary: string
  title: string
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
  | { content: string; plan: AiGeneratedPlan; type: 'plan_draft' }

export const isAiGeneratedPlan = (value: unknown): value is AiGeneratedPlan => {
  if (!isRecord(value)) return false
  if (typeof value.title !== 'string' || value.title.length === 0) return false
  if (typeof value.summary !== 'string' || value.summary.length === 0) return false
  if (!Array.isArray(value.days)) return false

  return value.days.every(isAiGeneratedPlanDay)
}

const isAiGeneratedPlanDay = (value: unknown): value is AiGeneratedPlanDay => {
  if (!isRecord(value)) return false

  return (
    typeof value.dayIndex === 'number' &&
    Number.isInteger(value.dayIndex) &&
    Array.isArray(value.meals) &&
    Array.isArray(value.workouts) &&
    Array.isArray(value.checkins)
  )
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
