<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

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

const showActivityLevelPicker = ref(false)
const activityLevelFieldValue = ref('')

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
  router.push('/profile')
}
</script>

<template>
  <main class="page-shell profile-edit-page">
    <van-nav-bar title="修改个人信息" left-arrow @click-left="router.push('/profile')" />

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
          placeholder="请输入饮食习惯"
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

      <div class="profile-edit-page__actions">
        <van-button type="primary" native-type="submit" block round>提交修改</van-button>
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
</style>
