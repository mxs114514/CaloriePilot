<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { showFailToast, showSuccessToast } from 'vant'

import { useProfileStore } from '@/stores/profile'
import type { ActivityLevel, Gender, ProfileForm } from '@/types'
import {
  calculateBmi,
  calculateDailyCalorieTarget,
  getBmiCategoryLabel,
  roundTo,
} from '@/utils/healthCalculations'

const showDialog = ref(true)
const showActivityLevelPicker = ref(false)
const activityLevelFieldValue = ref('')
const bmiDisplay = ref('--')
const isSubmitting = ref(false)
const profileStore = useProfileStore()

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

const handleSubmit = async () => {
  try {
    isSubmitting.value = true
    await profileStore.createProfileAndPlan(form)
    showSuccessToast('信息已保存')
    showDialog.value = false
  } catch {
    showFailToast('保存失败，请检查填写内容')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <van-popup
    v-model:show="showDialog"
    class="first-use-dialog"
    position="bottom"
    round
    :close-on-click-overlay="false"
  >
    <div class="first-use-dialog__header">
      <h1 class="first-use-dialog__title">首次使用请输入您的信息</h1>
    </div>

    <van-form @submit="handleSubmit">
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
          type="number"
          maxlength="5"
          placeholder="请输入身高（cm）"
          @blur="handleBodyMetricBlur"
        />
        <van-field
          v-model="form.currentWeightKg"
          label="体重"
          type="number"
          maxlength="5"
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
          placeholder="请输入饮食习惯,比如喜欢吃清淡/喜欢吃辣/喜欢吃甜食等，还有忌口的食物等"
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

      <div class="first-use-dialog__actions">
        <van-button
          type="primary"
          native-type="submit"
          block
          round
          :disabled="isSubmitDisabled"
          :loading="isSubmitting"
        >
          提交信息
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
  </van-popup>
</template>

<style scoped>
.first-use-dialog {
  max-height: 92vh;
  overflow-y: auto;
  padding: 18px 0 calc(18px + env(safe-area-inset-bottom));
}

.first-use-dialog__header {
  padding: 0 16px 6px;
}

.first-use-dialog__title {
  margin: 0;
  color: #111827;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.first-use-dialog__actions {
  padding: 24px 16px 0;
}

.health-hint {
  padding: 8px 16px;
  font-size: 12px;
  color: #969799;
  line-height: 1.5;
}
</style>
