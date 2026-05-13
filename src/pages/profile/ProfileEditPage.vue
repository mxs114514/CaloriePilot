<script setup lang="ts">
import type { ActivityLevel, Gender, ProfileForm } from '@/types'

import { storeToRefs } from 'pinia'
import { showFailToast, showSuccessToast } from 'vant'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useProfileStore } from '@/stores/profile'
import {
  calculateBmi,
  calculateDailyCalorieTarget,
  getBmiCategoryLabel,
  roundTo,
} from '@/utils/healthCalculations'

const router = useRouter()
const profileStore = useProfileStore()
const { activePlan, profile } = storeToRefs(profileStore)

const form = reactive<ProfileForm>({
  activityLevel: '',
  age: '',
  currentWeightKg: '',
  dietPreference: '',
  gender: '',
  heightCm: '',
  name: '',
  planDuration: '',
  weightLossTarget: '',
})

const showActivityLevelPicker = ref(false)
const activityLevelFieldValue = ref('')
const bmiDisplay = ref('--')
const isSubmitting = ref(false)

const activityLevelOptions = [
  { text: '久坐不动（办公室工作，几乎不运动）', value: 'sedentary' },
  { text: '轻度活动（每周轻运动1-3天）', value: 'light' },
  { text: '中度活动（每周中高强度运动3-5天）', value: 'moderate' },
  { text: '高度活动（每周高强度运动6-7天）', value: 'active' },
  { text: '极度活动（体力劳动者或一天练两次）', value: 'very_active' },
]

const activityLevelValues: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]
const genderValues: Gender[] = ['male', 'female']

const getPositiveNumber = (value: string) => {
  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : undefined
}

const isActivityLevel = (value: string): value is ActivityLevel =>
  activityLevelValues.includes(value as ActivityLevel)

const isGender = (value: string): value is Gender => genderValues.includes(value as Gender)

const handleActivityLevelConfirm = ({
  selectedOptions,
}: {
  selectedOptions: { text: string; value: string }[]
}) => {
  activityLevelFieldValue.value = selectedOptions[0]?.text ?? ''
  const selectedValue = selectedOptions[0]?.value ?? ''
  form.activityLevel = isActivityLevel(selectedValue) ? selectedValue : ''
  showActivityLevelPicker.value = false
}

const updateBmiDisplay = () => {
  const heightCm = Number(form.heightCm)
  const weightKg = Number(form.currentWeightKg)

  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0 || weightKg <= 0) {
    bmiDisplay.value = '--'
    return
  }

  const bmi = calculateBmi(weightKg, heightCm)

  bmiDisplay.value = `${roundTo(bmi, 2)}（${getBmiCategoryLabel(bmi)}）`
}

const healthCheckResult = computed(() => {
  const age = getPositiveNumber(form.age)
  const heightCm = getPositiveNumber(form.heightCm)
  const weightKg = getPositiveNumber(form.currentWeightKg)
  const planDurationDays = getPositiveNumber(form.planDuration)
  const weightLossTargetKg = getPositiveNumber(form.weightLossTarget)

  if (
    age === undefined ||
    heightCm === undefined ||
    weightKg === undefined ||
    planDurationDays === undefined ||
    weightLossTargetKg === undefined ||
    !isGender(form.gender) ||
    !isActivityLevel(form.activityLevel)
  ) {
    return { isComplete: false, underSafeMinimum: false }
  }

  const { dailyDeficit, rawDailyTarget, underSafeMinimum } = calculateDailyCalorieTarget({
    activityLevel: form.activityLevel,
    age,
    gender: form.gender,
    heightCm,
    planDurationDays,
    weightKg,
    weightLossTargetKg,
  })

  return { dailyDeficit, isComplete: true, rawDailyTarget, underSafeMinimum }
})

const isSubmitDisabled = computed(() => {
  const isBaseInfoComplete = !!form.name && healthCheckResult.value.isComplete

  return !isBaseInfoComplete || healthCheckResult.value.underSafeMinimum
})

const deficitDisplay = computed(() => {
  if (!healthCheckResult.value.isComplete || healthCheckResult.value.dailyDeficit === undefined) {
    return '--'
  }

  const deficit = roundTo(healthCheckResult.value.dailyDeficit, 0)
  const evalText = healthCheckResult.value.underSafeMinimum ? '不健康' : '健康'

  return `${deficit} kcal（${evalText}）`
})

const dailyTargetDisplay = computed(() => {
  if (!healthCheckResult.value.isComplete || healthCheckResult.value.rawDailyTarget === undefined) {
    return '--'
  }

  return `${roundTo(healthCheckResult.value.rawDailyTarget, 0)} kcal`
})

const checkDailyCalorieDeficitHealth = () => {
  if (healthCheckResult.value.isComplete && healthCheckResult.value.underSafeMinimum) {
    showFailToast('每日热量缺口过大，建议延长计划或降低减重目标')
  }
}

const handleBodyMetricBlur = () => {
  updateBmiDisplay()
  checkDailyCalorieDeficitHealth()
}

const fillForm = () => {
  if (!profile.value || !activePlan.value) return

  form.activityLevel = profile.value.activityLevel
  form.age = String(profile.value.age)
  form.currentWeightKg = String(profile.value.currentWeightKg)
  form.dietPreference = profile.value.dietPreference
  form.gender = profile.value.gender
  form.heightCm = String(profile.value.heightCm)
  form.name = profile.value.name
  form.planDuration = String(activePlan.value.durationDays)
  form.weightLossTarget = String(activePlan.value.weightLossTargetKg)
  activityLevelFieldValue.value =
    activityLevelOptions.find(option => option.value === profile.value?.activityLevel)?.text ?? ''
  updateBmiDisplay()
}

const handleSubmit = async () => {
  try {
    isSubmitting.value = true
    await profileStore.updateProfileAndPlan(form)
    showSuccessToast('修改已保存')
    router.push('/profile')
  } catch {
    showFailToast('保存失败，请检查填写内容')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  if (!profileStore.isInitialized) {
    await profileStore.loadInitialData()
  }

  fillForm()
})
</script>

<template>
  <main class="page-shell profile-edit-page">
    <van-empty v-if="profileStore.isInitialized && (!profile || !activePlan)" description="暂无可编辑的信息" />

    <van-form v-else @submit="handleSubmit">
      <van-cell-group title="基础信息" inset>
        <van-field v-model="form.name" label="姓名" maxlength="20" placeholder="请输入姓名" />
        <van-field label="性别">
          <template #input>
            <van-radio-group v-model="form.gender" direction="horizontal">
              <van-radio name="male">男</van-radio>
              <van-radio name="female">女</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        <van-field
          v-model="form.age"
          label="年龄"
          type="digit"
          maxlength="3"
          placeholder="请输入年龄"
          @blur="checkDailyCalorieDeficitHealth"
        />
        <van-field
          v-model="form.heightCm"
          label="身高"
          type="digit"
          maxlength="3"
          placeholder="请输入身高（cm）"
          @blur="handleBodyMetricBlur"
        />
        <van-field
          v-model="form.currentWeightKg"
          label="体重"
          type="number"
          maxlength="6"
          placeholder="请输入体重（kg）"
          @blur="handleBodyMetricBlur"
        />
        <van-field label="BMI 指数" :model-value="bmiDisplay" readonly />
      </van-cell-group>

      <van-cell-group title="个性偏好" inset>
        <van-field
          v-model="form.dietPreference"
          rows="2"
          autosize
          label="饮食习惯"
          type="textarea"
          maxlength="50"
          placeholder="请输入饮食习惯，比如喜欢清淡/喜欢吃辣/忌口食物等"
          show-word-limit
        />
        <van-field
          v-model="activityLevelFieldValue"
          label="运动强度"
          is-link
          readonly
          placeholder="请选择运动强度"
          @click="showActivityLevelPicker = true"
        />
      </van-cell-group>

      <van-cell-group title="计划信息" inset>
        <van-field
          v-model="form.planDuration"
          label="计划时长"
          type="digit"
          maxlength="4"
          placeholder="请输入计划时长（天）"
          @blur="checkDailyCalorieDeficitHealth"
        />
        <van-field
          v-model="form.weightLossTarget"
          label="减重目标"
          type="number"
          maxlength="5"
          placeholder="请输入减重目标（kg）"
          @blur="checkDailyCalorieDeficitHealth"
        />
        <van-field label="热量缺口" :model-value="deficitDisplay" readonly />
        <van-field label="每日理论摄入" :model-value="dailyTargetDisplay" readonly />
        <div class="health-hint">
          * 健康的计划建议为每周减重 0.5～1 kg,不易反弹并且伤害小。
        </div>
      </van-cell-group>

      <div class="profile-edit-page__actions">
        <van-button
          type="primary"
          native-type="submit"
          block
          round
          :disabled="isSubmitDisabled"
          :loading="isSubmitting"
        >
          提交修改
        </van-button>
      </div>
    </van-form>

    <van-popup v-model:show="showActivityLevelPicker" position="bottom" round>
      <van-picker
        title="运动强度"
        :columns="activityLevelOptions"
        @confirm="handleActivityLevelConfirm"
        @cancel="showActivityLevelPicker = false"
      />
    </van-popup>
  </main>
</template>

<style scoped>
.profile-edit-page {
  background: #f7f8fa;
}

.profile-edit-page__actions {
  padding: 24px 16px 0;
}

.health-hint {
  padding: 8px 16px;
  font-size: 12px;
  color: #969799;
  line-height: 1.5;
}
</style>
