import { db } from '@/db'
import type { CalorieRecord, DailyMealCalories, DateString, MealType } from '@/types'

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

interface AddMealCaloriesInput {
  calories: number
  createId: () => string
  date: DateString
  mealType: MealType
  now: string
  planId: string
}

interface ReplaceDailyMealCaloriesInput {
  createId: (mealType: MealType) => string
  date: DateString
  meals: DailyMealCalories
  now: string
  planId: string
}

export const buildDailyMealCaloriesFromRecords = (
  records: CalorieRecord[],
  planId: string,
  date: DateString,
): DailyMealCalories => {
  const meals: DailyMealCalories = {
    breakfast: 0,
    dinner: 0,
    lunch: 0,
    snack: 0,
  }

  for (const record of records) {
    if (record.planId === planId && record.date === date) {
      meals[record.mealType] = record.calories
    }
  }

  return meals
}

export const addMealCaloriesToRecords = (
  records: CalorieRecord[],
  input: AddMealCaloriesInput,
) => {
  const existingRecord = records.find(
    record =>
      record.planId === input.planId &&
      record.date === input.date &&
      record.mealType === input.mealType,
  )

  if (!existingRecord) {
    return [
      ...records,
      {
        calories: input.calories,
        createdAt: input.now,
        date: input.date,
        id: input.createId(),
        mealType: input.mealType,
        planId: input.planId,
        updatedAt: input.now,
      },
    ]
  }

  return records.map(record =>
    record === existingRecord
      ? {
          ...record,
          calories: record.calories + input.calories,
          updatedAt: input.now,
        }
      : record,
  )
}

export const replaceDailyMealCaloriesInRecords = (
  records: CalorieRecord[],
  input: ReplaceDailyMealCaloriesInput,
) => {
  let updatedRecords = records

  for (const mealType of mealTypes) {
    const existingRecord = updatedRecords.find(
      record =>
        record.planId === input.planId &&
        record.date === input.date &&
        record.mealType === mealType,
    )

    if (!existingRecord) {
      updatedRecords = [
        ...updatedRecords,
        {
          calories: input.meals[mealType],
          createdAt: input.now,
          date: input.date,
          id: input.createId(mealType),
          mealType,
          planId: input.planId,
          updatedAt: input.now,
        },
      ]
      continue
    }

    updatedRecords = updatedRecords.map(record =>
      record === existingRecord
        ? {
            ...record,
            calories: input.meals[mealType],
            updatedAt: input.now,
          }
        : record,
    )
  }

  return updatedRecords
}

export const getTodayMealCalories = async (planId: string, date = getLocalDateString()) => {
  const records = await getDailyCalorieRecords(planId, date)

  return buildDailyMealCaloriesFromRecords(records, planId, date)
}

export const addMealCalories = async (
  planId: string,
  mealType: MealType,
  calories: number,
  date = getLocalDateString(),
) => {
  assertNonNegativeCalories(calories)

  const now = new Date().toISOString()
  const records = await getDailyCalorieRecords(planId, date)
  const updatedRecords = addMealCaloriesToRecords(records, {
    calories,
    createId: () => crypto.randomUUID(),
    date,
    mealType,
    now,
    planId,
  })

  await saveChangedRecords(records, updatedRecords)

  return buildDailyMealCaloriesFromRecords(updatedRecords, planId, date)
}

export const saveTodayMealCalories = async (
  planId: string,
  meals: DailyMealCalories,
  date = getLocalDateString(),
) => {
  for (const mealType of mealTypes) {
    assertNonNegativeCalories(meals[mealType])
  }

  const now = new Date().toISOString()
  const records = await getDailyCalorieRecords(planId, date)
  const updatedRecords = replaceDailyMealCaloriesInRecords(records, {
    createId: mealType => `${date}-${mealType}-${crypto.randomUUID()}`,
    date,
    meals,
    now,
    planId,
  })

  await saveChangedRecords(records, updatedRecords)

  return buildDailyMealCaloriesFromRecords(updatedRecords, planId, date)
}

const getDailyCalorieRecords = (planId: string, date: DateString) =>
  db.calorieRecords
    .where('planId')
    .equals(planId)
    .filter(record => record.date === date)
    .toArray()

const saveChangedRecords = async (
  originalRecords: CalorieRecord[],
  updatedRecords: CalorieRecord[],
) => {
  const changedRecords = updatedRecords.filter(updatedRecord => {
    const originalRecord = originalRecords.find(record => record.id === updatedRecord.id)

    return !originalRecord || JSON.stringify(originalRecord) !== JSON.stringify(updatedRecord)
  })

  if (changedRecords.length > 0) {
    await db.calorieRecords.bulkPut(changedRecords)
  }
}

const assertNonNegativeCalories = (calories: number) => {
  if (!Number.isFinite(calories) || calories < 0) {
    throw new RangeError('calories must be greater than or equal to 0')
  }
}

const getLocalDateString = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
