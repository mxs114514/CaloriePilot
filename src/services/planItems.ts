import type { DateString, PlanCheckin, PlanItem, PlanItemType } from '@/types'

import { db } from '@/db'

export const getCurrentPlanItems = async (planId: string) => {
  const items = await db.planItems.where('planId').equals(planId).toArray()

  return items.sort(comparePlanItems)
}

export const togglePlanItemCheckin = async (planItemId: string, date: DateString) => {
  const now = new Date().toISOString()
  const existingCheckin = (await db.planCheckins.toArray()).find(
    checkin => checkin.planItemId === planItemId && checkin.date === date,
  )

  if (!existingCheckin) {
    const checkin: PlanCheckin = {
      completedAt: now,
      createdAt: now,
      date,
      id: crypto.randomUUID(),
      isCompleted: true,
      planItemId,
      updatedAt: now,
    }

    await db.planCheckins.add(checkin)

    return true
  }

  const isCompleted = !existingCheckin.isCompleted
  const updatedCheckin: PlanCheckin = {
    ...existingCheckin,
    completedAt: isCompleted ? now : undefined,
    isCompleted,
    updatedAt: now,
  }

  await db.planCheckins.put(updatedCheckin)

  return isCompleted
}

const comparePlanItems = (left: PlanItem, right: PlanItem) => {
  const leftDateKey = left.date ?? String(left.dayIndex ?? Number.MAX_SAFE_INTEGER)
  const rightDateKey = right.date ?? String(right.dayIndex ?? Number.MAX_SAFE_INTEGER)
  const dateResult = leftDateKey.localeCompare(rightDateKey)

  if (dateResult !== 0) return dateResult

  return getTypeOrder(left.type) - getTypeOrder(right.type)
}

const getTypeOrder = (type: PlanItemType) => {
  if (type === 'meal') return 1
  if (type === 'workout') return 2

  return 3
}
