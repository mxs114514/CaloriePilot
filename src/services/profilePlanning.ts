import type { GoalPlan, ProfileForm, UserProfile } from '@/types'

import {
  calculateBmi,
  calculateDailyCalorieTarget,
  roundTo,
} from '@/utils/healthCalculations'

export interface ProfilePlanningRuntime {
  createId?: () => string
  getNow?: () => string
  getToday?: () => string
}

export interface ProfileAndPlan {
  archivedPlan?: GoalPlan
  plan: GoalPlan
  profile: UserProfile
}

export const buildProfileAndPlan = (
  form: ProfileForm,
  runtime: ProfilePlanningRuntime = {},
): ProfileAndPlan => {
  const now = getNow(runtime)
  const id = runtime.createId?.() ?? crypto.randomUUID()
  const parsedForm = parseProfileForm(form)
  const calculated = calculateProfileMetrics(parsedForm)

  const profile: UserProfile = {
    id,
    activityLevel: parsedForm.activityLevel,
    age: parsedForm.age,
    bmi: calculated.bmi,
    createdAt: now,
    currentWeightKg: parsedForm.currentWeightKg,
    dailyCalorieTarget: calculated.dailyCalorieTarget,
    dietPreference: parsedForm.dietPreference,
    gender: parsedForm.gender,
    heightCm: parsedForm.heightCm,
    name: parsedForm.name,
    tdee: calculated.tdee,
    updatedAt: now,
  }

  const plan: GoalPlan = {
    id,
    createdAt: now,
    dailyCalorieTarget: calculated.dailyCalorieTarget,
    durationDays: parsedForm.planDuration,
    startDate: runtime.getToday?.() ?? getLocalDateString(new Date()),
    startWeightKg: parsedForm.currentWeightKg,
    status: 'active',
    updatedAt: now,
    weightLossTargetKg: parsedForm.weightLossTarget,
  }

  return { plan, profile }
}

export const updateProfileAndPlan = (
  profile: UserProfile,
  _plan: GoalPlan,
  form: ProfileForm,
  runtime: ProfilePlanningRuntime = {},
): ProfileAndPlan => {
  const now = getNow(runtime)
  const planId = runtime.createId?.() ?? crypto.randomUUID()
  const parsedForm = parseProfileForm(form)
  const calculated = calculateProfileMetrics(parsedForm)

  return {
    profile: {
      ...profile,
      activityLevel: parsedForm.activityLevel,
      age: parsedForm.age,
      bmi: calculated.bmi,
      currentWeightKg: parsedForm.currentWeightKg,
      dailyCalorieTarget: calculated.dailyCalorieTarget,
      dietPreference: parsedForm.dietPreference,
      gender: parsedForm.gender,
      heightCm: parsedForm.heightCm,
      name: parsedForm.name,
      tdee: calculated.tdee,
      updatedAt: now,
    },
    archivedPlan: {
      ..._plan,
      status: 'archived',
      updatedAt: now,
    },
    plan: {
      id: planId,
      createdAt: now,
      dailyCalorieTarget: calculated.dailyCalorieTarget,
      durationDays: parsedForm.planDuration,
      startDate: runtime.getToday?.() ?? getLocalDateString(new Date()),
      startWeightKg: parsedForm.currentWeightKg,
      status: 'active',
      updatedAt: now,
      weightLossTargetKg: parsedForm.weightLossTarget,
    },
  }
}

interface ParsedProfileForm {
  activityLevel: Exclude<ProfileForm['activityLevel'], ''>
  age: number
  currentWeightKg: number
  dietPreference: string
  gender: Exclude<ProfileForm['gender'], ''>
  heightCm: number
  name: string
  planDuration: number
  weightLossTarget: number
}

const parseProfileForm = (form: ProfileForm): ParsedProfileForm => {
  if (!form.activityLevel) throw new RangeError('activityLevel is required')
  if (!form.gender) throw new RangeError('gender is required')
  if (!form.name.trim()) throw new RangeError('name is required')

  return {
    activityLevel: form.activityLevel,
    age: parsePositiveNumber(form.age, 'age'),
    currentWeightKg: parsePositiveNumber(form.currentWeightKg, 'currentWeightKg'),
    dietPreference: form.dietPreference.trim(),
    gender: form.gender,
    heightCm: parsePositiveNumber(form.heightCm, 'heightCm'),
    name: form.name.trim(),
    planDuration: parsePositiveNumber(form.planDuration, 'planDuration'),
    weightLossTarget: parsePositiveNumber(form.weightLossTarget, 'weightLossTarget'),
  }
}

const parsePositiveNumber = (value: string, fieldName: string) => {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new RangeError(`${fieldName} must be greater than 0`)
  }

  return parsedValue
}

const calculateProfileMetrics = (form: ParsedProfileForm) => {
  const bmi = calculateBmi(form.currentWeightKg, form.heightCm)
  const calorieTarget = calculateDailyCalorieTarget({
    activityLevel: form.activityLevel,
    age: form.age,
    gender: form.gender,
    heightCm: form.heightCm,
    planDurationDays: form.planDuration,
    weightKg: form.currentWeightKg,
    weightLossTargetKg: form.weightLossTarget,
  })

  return {
    bmi: roundTo(bmi, 2),
    dailyCalorieTarget: roundTo(calorieTarget.dailyTarget, 0),
    tdee: roundTo(calorieTarget.tdee, 0),
  }
}

const getNow = (runtime: ProfilePlanningRuntime) =>
  runtime.getNow?.() ?? new Date().toISOString()

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
