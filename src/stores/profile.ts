import { defineStore } from 'pinia'

import { getActivePlan, getCurrentProfile, replaceActivePlan, saveProfileAndPlan } from '@/db'
import { buildProfileAndPlan, updateProfileAndPlan } from '@/services/profilePlanning'
import type { GoalPlan, ProfileForm, UserProfile } from '@/types'

export const useProfileStore = defineStore('profile', {
  actions: {
    async createProfileAndPlan(form: ProfileForm) {
      const { plan, profile } = buildProfileAndPlan(form)

      await saveProfileAndPlan(profile, plan)

      this.profile = profile
      this.activePlan = plan
    },

    async loadInitialData() {
      const [profile, activePlan] = await Promise.all([getCurrentProfile(), getActivePlan()])

      this.profile = profile ?? null
      this.activePlan = activePlan ?? null
      this.isInitialized = true
    },

    async updateProfileAndPlan(form: ProfileForm) {
      if (!this.profile || !this.activePlan) {
        throw new Error('Profile and active plan must exist before updating')
      }

      const { archivedPlan, plan, profile } = updateProfileAndPlan(this.profile, this.activePlan, form)

      if (!archivedPlan) {
        throw new Error('Archived plan must exist when updating active plan')
      }

      await replaceActivePlan(profile, archivedPlan, plan)

      this.profile = profile
      this.activePlan = plan
    },
  },

  getters: {
    hasCompletedOnboarding: state => Boolean(state.profile && state.activePlan),
  },

  state: () => ({
    activePlan: null as GoalPlan | null,
    isInitialized: false,
    profile: null as UserProfile | null,
  }),
})
