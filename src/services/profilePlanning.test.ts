import type { ProfileForm } from '@/types'

import { describe, expect, it } from 'vitest'

import { buildProfileAndPlan, updateProfileAndPlan, updateProfileCurrentWeight } from './profilePlanning'

describe('profile planning service', () => {
  const form: ProfileForm = {
    activityLevel: 'light',
    age: '30',
    currentWeightKg: '70',
    dietPreference: 'low sugar',
    gender: 'male',
    heightCm: '175',
    name: 'Alex',
    planDuration: '60',
    weightLossTarget: '5',
  }

  it('creates a user profile and active goal plan from form values', () => {
    const result = buildProfileAndPlan(form, {
      createId: () => 'fixed-id',
      getToday: () => '2026-05-12',
      getNow: () => '2026-05-12T10:00:00.000Z',
    })

    expect(result.profile).toMatchObject({
      id: 'fixed-id',
      name: 'Alex',
      age: 30,
      heightCm: 175,
      currentWeightKg: 70,
      activityLevel: 'light',
      gender: 'male',
      dietPreference: 'low sugar',
    })
    expect(result.profile.bmi).toBeCloseTo(22.86, 2)
    expect(result.profile.tdee).toBeGreaterThan(0)
    expect(result.profile.dailyCalorieTarget).toBeGreaterThan(0)
    expect(result.plan).toMatchObject({
      id: 'fixed-id',
      startDate: '2026-05-12',
      durationDays: 60,
      startWeightKg: 70,
      weightLossTargetKg: 5,
      dailyCalorieTarget: result.profile.dailyCalorieTarget,
      status: 'active',
    })
  })

  it('updates existing user profile and creates a new active goal plan', () => {
    const created = buildProfileAndPlan(form, {
      createId: () => 'fixed-id',
      getToday: () => '2026-05-12',
      getNow: () => '2026-05-12T10:00:00.000Z',
    })

    const updated = updateProfileAndPlan(created.profile, created.plan, {
      ...form,
      currentWeightKg: '68',
      planDuration: '90',
      weightLossTarget: '4',
    }, {
      createId: () => 'new-plan-id',
      getNow: () => '2026-05-13T10:00:00.000Z',
      getToday: () => '2026-05-13',
    })

    expect(updated.profile.id).toBe(created.profile.id)
    expect(updated.archivedPlan).toMatchObject({
      ...created.plan,
      status: 'archived',
      updatedAt: '2026-05-13T10:00:00.000Z',
    })
    expect(updated.plan.id).toBe('new-plan-id')
    expect(updated.plan.createdAt).toBe('2026-05-13T10:00:00.000Z')
    expect(updated.plan.startDate).toBe('2026-05-13')
    expect(updated.profile.currentWeightKg).toBe(68)
    expect(updated.plan.durationDays).toBe(90)
    expect(updated.plan.weightLossTargetKg).toBe(4)
    expect(updated.plan.status).toBe('active')
    expect(updated.profile.updatedAt).toBe('2026-05-13T10:00:00.000Z')
    expect(updated.plan.updatedAt).toBe('2026-05-13T10:00:00.000Z')
  })

  it('updates only current weight metrics for a daily weight record', () => {
    const created = buildProfileAndPlan(form, {
      createId: () => 'fixed-id',
      getToday: () => '2026-05-12',
      getNow: () => '2026-05-12T10:00:00.000Z',
    })

    const updatedProfile = updateProfileCurrentWeight(created.profile, 68.5, {
      getNow: () => '2026-05-13T10:00:00.000Z',
    })

    expect(updatedProfile).toMatchObject({
      id: created.profile.id,
      currentWeightKg: 68.5,
      updatedAt: '2026-05-13T10:00:00.000Z',
    })
    expect(updatedProfile.bmi).toBeCloseTo(22.37, 2)
    expect(updatedProfile.tdee).toBe(created.profile.tdee)
    expect(updatedProfile.dailyCalorieTarget).toBe(created.profile.dailyCalorieTarget)
  })
})
