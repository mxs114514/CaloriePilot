<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="page-shell profile-page">
    <van-cell-group title="基础信息" inset>
      <van-cell title="姓名" value="xxx" />
      <van-cell title="性别" value="xxx" />
      <van-cell title="年龄" value="xxx" />
      <van-cell title="身高" value="xxx" />
      <van-cell title="体重" value="xxx" />
      <van-cell title="BMI 指数" value="xxx" />
    </van-cell-group>

    <van-cell-group title="个性偏好" inset>
      <van-cell title="饮食习惯" value="xxx" />
      <van-cell title="运动强度" value="xxx" />
    </van-cell-group>

    <van-cell-group title="计划信息" inset>
      <van-cell title="计划时长" value="xxx/xxx" />
      <van-cell title="减重目标" value="xxx.xx/xxx.xx" />
    </van-cell-group>

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
