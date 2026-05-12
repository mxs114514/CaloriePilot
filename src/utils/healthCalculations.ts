import type { ActivityLevel, Gender } from '@/types'

/**
 * BMI 分类，采用 doc/计算规则.md 中的中国参考标准。
 */
export type BmiCategory = 'normal' | 'obese' | 'overweight' | 'underweight'

/**
 * 每日摄入目标计算结果，单位均为 kcal。
 */
export interface DailyCalorieTargetResult {
  /** 基础代谢率，单位：kcal */
  bmr: number
  /** 每日热量缺口，单位：kcal */
  dailyDeficit: number
  /** 受健康底线保护后的推荐每日摄入目标，单位：kcal */
  dailyTarget: number
  /** 未应用健康底线前的每日摄入目标，单位：kcal */
  rawDailyTarget: number
  /** 当前性别和 BMR 对应的健康底线，单位：kcal */
  safeMinimum: number
  /** 每日总消耗，单位：kcal */
  tdee: number
  /** 未应用健康底线前的摄入目标是否低于 safeMinimum */
  underSafeMinimum: boolean
}

export interface BmrInput {
  /** 年龄，单位：岁 */
  age: number
  gender: Gender
  /** 身高，单位：厘米 */
  heightCm: number
  /** 当前体重，单位：千克 */
  weightKg: number
}

export interface DailyCalorieTargetInput extends BmrInput {
  activityLevel: ActivityLevel
  /** 计划总时长，单位：天 */
  planDurationDays: number
  /** 目标减重数，单位：千克 */
  weightLossTargetKg: number
}

/**
 * 日常活动系数（PAL），用于将 BMR 换算为 TDEE。
 */
export const ACTIVITY_LEVEL_MULTIPLIERS: Record<ActivityLevel, number> = {
  active: 1.725,
  light: 1.375,
  moderate: 1.55,
  sedentary: 1.2,
  very_active: 1.9,
}

/**
 * BMI 分类中文标签。
 */
export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  normal: '正常',
  obese: '肥胖',
  overweight: '超重',
  underweight: '偏瘦',
}

/**
 * 减去 1kg 纯脂肪约需要消耗的热量，单位：kcal。
 */
export const KCAL_PER_KG_FAT = 7700

const GENDER_SAFE_MINIMUM_CALORIES: Record<Gender, number> = {
  female: 1200,
  male: 1500,
}

/**
 * 计算 BMI 指数。
 *
 * @param weightKg 当前体重，单位：千克
 * @param heightCm 身高，单位：厘米
 */
export const calculateBmi = (weightKg: number, heightCm: number) => {
  assertPositiveNumber(weightKg, 'weightKg')
  assertPositiveNumber(heightCm, 'heightCm')

  const heightM = heightCm / 100

  return weightKg / heightM ** 2
}

/**
 * 根据中国参考标准返回 BMI 分类。
 *
 * @param bmi BMI 指数
 */
export const getBmiCategory = (bmi: number): BmiCategory => {
  assertPositiveNumber(bmi, 'bmi')

  if (bmi < 18.5) {
    return 'underweight'
  }

  if (bmi < 24) {
    return 'normal'
  }

  if (bmi < 28) {
    return 'overweight'
  }

  return 'obese'
}

/**
 * 根据中国参考标准返回 BMI 分类中文标签。
 *
 * @param bmi BMI 指数
 */
export const getBmiCategoryLabel = (bmi: number) => BMI_CATEGORY_LABELS[getBmiCategory(bmi)]

/**
 * 使用 Mifflin-St Jeor 公式计算基础代谢率 BMR。
 *
 * @returns 基础代谢率，单位：kcal
 */
export const calculateBmr = ({ age, gender, heightCm, weightKg }: BmrInput) => {
  assertPositiveNumber(age, 'age')
  assertPositiveNumber(heightCm, 'heightCm')
  assertPositiveNumber(weightKg, 'weightKg')

  const genderOffset = gender === 'male' ? 5 : -161

  return 10 * weightKg + 6.25 * heightCm - 5 * age + genderOffset
}

/**
 * 根据基础代谢率和活动水平计算每日总消耗 TDEE。
 *
 * @param bmr 基础代谢率，单位：kcal
 * @param activityLevel 日常活动水平
 * @returns 每日总消耗，单位：kcal
 */
export const calculateTdee = (bmr: number, activityLevel: ActivityLevel) => {
  assertPositiveNumber(bmr, 'bmr')

  return bmr * ACTIVITY_LEVEL_MULTIPLIERS[activityLevel]
}

/**
 * 根据目标减重数和计划天数计算每日热量缺口。
 *
 * @param weightLossTargetKg 目标减重数，单位：千克
 * @param durationDays 计划总时长，单位：天
 * @returns 每日热量缺口，单位：kcal
 */
export const calculateDailyCalorieDeficit = (weightLossTargetKg: number, durationDays: number) => {
  assertPositiveNumber(weightLossTargetKg, 'weightLossTargetKg')
  assertPositiveNumber(durationDays, 'durationDays')

  return (weightLossTargetKg * KCAL_PER_KG_FAT) / durationDays
}

/**
 * 计算健康底线，取个人 BMR 与性别最低建议摄入值中的较大值。
 *
 * @param bmr 基础代谢率，单位：kcal
 * @param gender 用户性别
 * @returns 健康底线，单位：kcal
 */
export const calculateSafeMinimumCalories = (bmr: number, gender: Gender) => {
  assertPositiveNumber(bmr, 'bmr')

  return Math.max(bmr, GENDER_SAFE_MINIMUM_CALORIES[gender])
}

/**
 * 计算每日摄入目标，并在目标低于健康底线时上调到 safeMinimum。
 *
 * @returns 每日摄入目标计算结果，单位均为 kcal
 */
export const calculateDailyCalorieTarget = ({
  activityLevel,
  age,
  gender,
  heightCm,
  planDurationDays,
  weightKg,
  weightLossTargetKg,
}: DailyCalorieTargetInput): DailyCalorieTargetResult => {
  const bmr = calculateBmr({ age, gender, heightCm, weightKg })
  const tdee = calculateTdee(bmr, activityLevel)
  const dailyDeficit = calculateDailyCalorieDeficit(weightLossTargetKg, planDurationDays)
  const rawDailyTarget = tdee - dailyDeficit
  const safeMinimum = calculateSafeMinimumCalories(bmr, gender)
  const underSafeMinimum = rawDailyTarget < safeMinimum

  return {
    bmr,
    dailyDeficit,
    dailyTarget: underSafeMinimum ? safeMinimum : rawDailyTarget,
    rawDailyTarget,
    safeMinimum,
    tdee,
    underSafeMinimum,
  }
}

/**
 * 按指定小数位四舍五入，供页面展示计算结果时复用。
 *
 * @param value 需要格式化的数值
 * @param digits 保留小数位数
 */
export const roundTo = (value: number, digits = 0) => {
  assertFiniteNumber(value, 'value')
  assertNonNegativeNumber(digits, 'digits')

  const multiplier = 10 ** digits

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier
}

const assertPositiveNumber = (value: number, fieldName: string) => {
  assertFiniteNumber(value, fieldName)

  if (value <= 0) {
    throw new RangeError(`${fieldName} must be greater than 0`)
  }
}

const assertNonNegativeNumber = (value: number, fieldName: string) => {
  assertFiniteNumber(value, fieldName)

  if (value < 0) {
    throw new RangeError(`${fieldName} must be greater than or equal to 0`)
  }
}

const assertFiniteNumber = (value: number, fieldName: string) => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${fieldName} must be a finite number`)
  }
}
