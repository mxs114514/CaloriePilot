/**
 * 用户性别
 * - male: 男
 * - female: 女
 */
export type Gender = 'male' | 'female'

/**
 * 用户的日常活动水平
 * - sedentary: 久坐不动（办公室工作，几乎不运动）
 * - light: 轻度活动（每周轻运动1-3天）
 * - moderate: 中度活动（每周中高强度运动3-5天）
 * - active: 高度活动（每周高强度运动6-7天）
 * - very_active: 极度活动（体力劳动者或一天练两次）
 */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

/**
 * 饮食习惯
 * 当前页面使用自由文本输入，最多 50 个字。
 */
export type DietPreference = string

/**
 * 用餐类型
 * - breakfast: 早餐
 * - lunch: 中餐
 * - dinner: 晚餐
 * - snack: 加餐/零食
 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type PlanStatus = 'active' | 'archived' | 'completed'

/**
 * YYYY-MM-DD 格式日期字符串
 */
export type DateString = string

/**
 * ISO 日期时间字符串
 */
export type DateTimeString = string

/**
 * 用户基本资料。
 *
 * BMI、TDEE 和每日摄入目标在前端提交前计算好并缓存，便于后续直接展示。
 */
export interface UserProfile {
  id: string
  name: string
  gender: Gender
  age: number
  /** 身高，单位：厘米 */
  heightCm: number
  /** 当前体重，单位：千克；展示时保留两位小数 */
  currentWeightKg: number
  /** BMI 指数，无单位；由身高和当前体重计算后保存 */
  bmi: number
  dietPreference: DietPreference
  activityLevel: ActivityLevel
  /** 每日总消耗，单位：kcal/天；由 BMR 和日常活动水平计算后保存 */
  tdee: number
  /** 每日目标摄入热量，单位：kcal/天；由 TDEE、目标减重数和计划天数计算后保存 */
  dailyCalorieTarget: number
  createdAt: DateTimeString
  updatedAt: DateTimeString
}

/**
 * 减重目标计划设置。
 */
export interface GoalPlan {
  id: string
  /** 计划开始日期 */
  startDate: DateString
  /** 计划总时长，单位：天 */
  durationDays: number
  /** 计划开始时体重，单位：千克；展示时保留两位小数 */
  startWeightKg: number
  /** 目标减重数，单位：千克；展示时保留两位小数 */
  weightLossTargetKg: number
  /** 系统计算出的每日目标摄入热量，单位：kcal */
  dailyCalorieTarget: number
  /** 计划状态 */
  status: PlanStatus
  createdAt: DateTimeString
  updatedAt: DateTimeString
}

/**
 * 记录页当前表单状态。
 *
 * 页面输入框使用字符串承接 Vant Field 的 v-model，提交或保存前再转换为数字。
 */
export interface DailyMealCaloriesForm {
  breakfast: string
  lunch: string
  dinner: string
  snack: string
}

/**
 * 记录页计算后的当天四餐热量。
 */
export interface DailyMealCalories {
  breakfast: number
  lunch: number
  dinner: number
  snack: number
}

/**
 * 每餐热量摄入记录。
 */
export interface CalorieRecord {
  id: string
  /** 所属计划 ID */
  planId: string
  /** 记录日期 */
  date: DateString
  mealType: MealType
  /** 摄入热量，单位：kcal */
  calories: number
  createdAt: DateTimeString
  updatedAt: DateTimeString
}

/**
 * 每日体重记录。
 */
export interface WeightRecord {
  id: string
  /** 所属计划 ID */
  planId: string
  /** 记录日期 */
  date: DateString
  /** 体重，单位：千克；展示时保留两位小数 */
  weightKg: number
  createdAt: DateTimeString
  updatedAt: DateTimeString
}

/**
 * 首次使用和修改个人信息页面的表单状态。
 *
 * 页面层全部使用字符串承接输入框，真正保存前再转换为 UserProfile 和 GoalPlan。
 */
export interface ProfileForm {
  activityLevel: ActivityLevel | ''
  age: string
  currentWeightKg: string
  dietPreference: string
  gender: Gender | ''
  heightCm: string
  name: string
  planDuration: string
  weightLossTarget: string
}

/**
 * 我的计划展示数据。
 */
export interface ProfilePlanProgress {
  /** 当前第几天 */
  currentDay: number
  /** 计划总天数 */
  totalDays: number
  /** 当前已减重量，单位：千克；展示时保留两位小数 */
  currentWeightLossKg: number
  /** 计划减重目标，单位：千克；展示时保留两位小数 */
  targetWeightLossKg: number
}

/**
 * 自定义的每日计划/打卡事项模型。
 */
export type PlanItemSource = 'ai' | 'manual'

export type PlanItemType = 'habit' | 'meal' | 'workout'

export interface PlanItem {
  calories?: number
  createdAt: DateTimeString
  date?: DateString
  dayIndex?: number
  description?: string
  id: string
  metadata?: Record<string, unknown>
  /** 所属计划 ID */
  planId: string
  source: PlanItemSource
  title: string
  type: PlanItemType
  updatedAt: DateTimeString
}

/**
 * 用户每日执行的计划完成状况打卡。
 */
export interface PlanCheckin {
  id: string
  /** 打卡日期 */
  date: DateString
  planItemId: string
  isCompleted: boolean
  completedAt?: DateTimeString
  createdAt: DateTimeString
  updatedAt: DateTimeString
}
