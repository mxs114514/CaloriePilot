import Dexie, { type Table } from 'dexie'

import type {
  CalorieRecord,
  GoalPlan,
  PlanCheckin,
  PlanItem,
  UserProfile,
  WeightRecord,
} from '@/types'

class CaloriePilotDatabase extends Dexie {
  calorieRecords!: Table<CalorieRecord, string>
  goalPlans!: Table<GoalPlan, string>
  planCheckins!: Table<PlanCheckin, string>
  planItems!: Table<PlanItem, string>
  profiles!: Table<UserProfile, string>
  weightRecords!: Table<WeightRecord, string>

  constructor() {
    super('CaloriePilot')

    this.version(1).stores({
      calorieRecords: 'id, planId, date',
      goalPlans: 'id, status, createdAt',
      planCheckins: 'id, planItemId, date',
      planItems: 'id, createdAt',
      profiles: 'id, createdAt',
      weightRecords: 'id, planId, date',
    })
  }
}

export const db = new CaloriePilotDatabase()

export const getCurrentProfile = () => db.profiles.orderBy('createdAt').first()

export const getActivePlan = () => db.goalPlans.where('status').equals('active').first()

export const saveProfileAndPlan = async (profile: UserProfile, plan: GoalPlan) => {
  await db.transaction('rw', db.profiles, db.goalPlans, async () => {
    await db.profiles.put(profile)
    await db.goalPlans.put(plan)
  })
}

export const replaceActivePlan = async (
  profile: UserProfile,
  archivedPlan: GoalPlan,
  activePlan: GoalPlan,
) => {
  await db.transaction('rw', db.profiles, db.goalPlans, async () => {
    await db.profiles.put(profile)
    await db.goalPlans.put(archivedPlan)
    await db.goalPlans.put(activePlan)
  })
}
