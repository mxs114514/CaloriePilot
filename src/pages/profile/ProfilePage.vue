<script setup lang="ts">
import type { ActivityLevel, Gender } from '@/types'

import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useProfileStore } from '@/stores/profile'
import {
  calculateDailyCalorieDeficit,
  roundTo,
} from '@/utils/healthCalculations'

const router = useRouter()
const profileStore = useProfileStore()
const { activePlan, profile } = storeToRefs(profileStore)

const genderLabels: Record<Gender, string> = {
  female: '女',
  male: '男',
}

const activityLevelLabels: Record<ActivityLevel, string> = {
  active: '高度活动',
  light: '轻度活动',
  moderate: '中度活动',
  sedentary: '久坐不动',
  very_active: '极度活动',
}

const planDayDisplay = computed(() => {
  if (!activePlan.value) return '--'

  const startTime = new Date(`${activePlan.value.startDate}T00:00:00`).getTime()
  const today = new Date()
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const currentDay = Math.min(
    Math.max(Math.floor((todayTime - startTime) / 86_400_000) + 1, 1),
    activePlan.value.durationDays,
  )

  return `${currentDay}/${activePlan.value.durationDays} 天`
})

const formatWeight = (value?: number) => (value === undefined ? '--' : `${value.toFixed(2)} kg`)

const formatCalories = (value?: number) => (value === undefined ? '--' : `${value} kcal`)

const calorieDeficitDisplay = computed(() => {
  if (!activePlan.value) return '--'

  return `${roundTo(
    calculateDailyCalorieDeficit(activePlan.value.weightLossTargetKg, activePlan.value.durationDays),
    0,
  )} kcal`
})

const theoreticalDailyIntakeDisplay = computed(() => {
  if (!activePlan.value) return '--'

  return formatCalories(activePlan.value.dailyCalorieTarget)
})
</script>

<template>
  <main class="page-shell profile-page">
    <van-empty v-if="!profile || !activePlan" description="暂无个人信息" />

    <template v-else>
      <van-cell-group title="基础信息" inset>
        <van-cell title="姓名" :value="profile.name" />
        <van-cell title="性别" :value="genderLabels[profile.gender]" />
        <van-cell title="年龄" :value="`${profile.age} 岁`" />
        <van-cell title="身高" :value="`${profile.heightCm} cm`" />
        <van-cell title="体重" :value="formatWeight(profile.currentWeightKg)" />
        <van-cell title="BMI 指数" :value="profile.bmi.toFixed(2)" />
      </van-cell-group>

      <van-cell-group title="个性偏好" inset>
        <van-cell title="饮食习惯" :value="profile.dietPreference || '未填写'" />
        <van-cell title="运动强度" :value="activityLevelLabels[profile.activityLevel]" />
      </van-cell-group>

      <van-cell-group title="计划信息" inset>
        <van-cell title="计划进度" :value="planDayDisplay" />
        <van-cell title="计划开始体重" :value="formatWeight(activePlan.startWeightKg)" />
        <van-cell title="减重目标" :value="formatWeight(activePlan.weightLossTargetKg)" />
        <van-cell title="热量缺口" :value="calorieDeficitDisplay" />
        <van-cell title="每日理论摄入" :value="theoreticalDailyIntakeDisplay" />
      </van-cell-group>
    </template>

    <div class="profile-page__actions">
      <van-button type="primary" block round @click="router.push('/profile/edit')">
        修改个人信息
      </van-button>
    </div>
  </main>
</template>

<style scoped>
.profile-page {
  background: #f7f8fa;
  padding-top: 12px;
}

.profile-page__actions {
  padding: 24px 16px 0;
}
</style>
