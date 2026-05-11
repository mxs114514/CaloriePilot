/**
 * 用户的日常活动水平
 * - low: 久坐/极少运动
 * - medium: 轻度/中度运动
 * - high: 高强度运动/体力劳动
 */
export type ActivityLevel = 'low' | 'medium' | 'high'

/**
 * 饮食偏好
 * 用户可自由输入的字符串
 */
export type DietPreference = string
export type Gender = 'male' | 'female'

/**
 * 用餐类型
 * - breakfast: 早餐
 * - lunch: 午餐
 * - dinner: 晚餐
 * - snack: 加餐/零食
 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/**
 * 用户基本档案配置
 */
export interface UserProfile {
  id: string
  name: string
  gender: Gender
  age: number
  /** 身高 (厘米) */
  heightCm: number
  /** 当前体重 (千克) */
  currentWeightKg: number
  /** BMI 指数 */
  bmi: number
  dietPreference: DietPreference
  activityLevel: ActivityLevel
  createdAt: string
  updatedAt: string
}

/**
 * 减重目标计划设置
 */
export interface GoalPlan {
  id: string
  /** 计划开始日期，通常格式为 YYYY-MM-DD */
  startDate: string
  /** 计划持续天数 */
  durationDays: number
  /** 计划开始时体重 (千克) */
  startWeightKg: number
  /** 目标减重数 (千克) */
  weightLossTargetKg: number
  /** 系统计算出的每日建议摄入热量 (千卡) */
  dailyCalorieTarget: number
  createdAt: string
  updatedAt: string
}

/**
 * 每日饮食热量摄入记录
 */
export interface CalorieRecord {
  id: string
  /** 记录日期 (YYYY-MM-DD) */
  date: string
  /** 对应具体的哪一餐 */
  mealType: MealType
  /** 摄入的热量 (千卡) */
  calories: number
  createdAt: string
  updatedAt: string
}

/**
 * 体重变化记录打卡
 */
export interface WeightRecord {
  id: string
  /** 记录日期 (YYYY-MM-DD) */
  date: string
  /** 记录时的称重重量 (千克) */
  weightKg: number
  createdAt: string
  updatedAt: string
}

/**
 * 自定义的每日计划/打卡事项模型
 */
export interface PlanItem {
  id: string
  /** 计划名称，如：喝8杯水、跑步30分钟等 */
  title: string
  createdAt: string
  updatedAt: string
}

/**
 * 用户每日执行的计划完成状况打卡
 */
export interface PlanCheckin {
  id: string
  /** 打卡日期 (YYYY-MM-DD) */
  date: string
  /** 关联到的具体计划事项 ID */
  planItemId: string
  /** 标志今天是否已完成该计划 */
  isCompleted: boolean
  /** 实际勾选完成的具体时间 */
  completedAt?: string
  createdAt: string
  updatedAt: string
}

