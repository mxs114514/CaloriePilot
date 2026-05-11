<script setup lang="ts">
import { reactive, ref } from 'vue'

const showDialog = ref(true)
const showActivityLevelPicker = ref(false)
const activityLevelFieldValue = ref('')

const form = reactive({
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
  { text: '久坐/极少运动', value: 'low' },
  { text: '轻度/中度运动', value: 'medium' },
  { text: '高强度运动/体力劳动', value: 'high' },
]

const handleActivityLevelConfirm = ({
  selectedOptions,
}: {
  selectedOptions: { text: string; value: string }[]
}) => {
  activityLevelFieldValue.value = selectedOptions[0]?.text ?? ''
  form.activityLevel = selectedOptions[0]?.value ?? ''
  showActivityLevelPicker.value = false
}

const handleSubmit = () => {
  showDialog.value = false
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
        <van-field v-model="form.name" label="姓名" placeholder="请输入姓名" />
        <van-field label="性别">
          <template #input>
            <van-radio-group v-model="form.gender" direction="horizontal">
              <van-radio name="male">男</van-radio>
              <van-radio name="female">女</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        <van-field v-model="form.age" label="年龄" type="digit" placeholder="请输入年龄" />
        <van-field v-model="form.heightCm" label="身高" type="number" placeholder="请输入身高（cm）" />
        <van-field
          v-model="form.currentWeightKg"
          label="体重"
          type="number"
          placeholder="请输入体重（kg）"
        />
        <van-field label="BMI 指数" model-value="xxx" readonly />
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
          placeholder="请输入计划时长（天）"
        />
        <van-field
          v-model="form.weightLossTarget"
          label="减重目标"
          type="number"
          placeholder="请输入减重目标（kg）"
        />
      </van-cell-group>

      <div class="first-use-dialog__actions">
        <van-button type="primary" native-type="submit" block round>提交信息</van-button>
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
</style>
