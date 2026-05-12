<script setup lang="ts">
import { showToast } from 'vant'

const showDevelopingToast = () => {
  showToast({
    icon: 'warning-o',
    message: '功能正在开发中...',
  })
}
</script>

<template>
  <div class="tabbar-container">
    <van-tabbar class="app-tabbar" route safe-area-inset-bottom :fixed="false">
      <van-tabbar-item replace to="/record" icon="records-o">记录</van-tabbar-item>
      <van-tabbar-item icon="todo-list-o" @click="showDevelopingToast">计划清单</van-tabbar-item>
      <van-tabbar-item replace to="/history" icon="chart-trending-o">历史</van-tabbar-item>
      <van-tabbar-item replace to="/profile" icon="user-o">个人中心</van-tabbar-item>
    </van-tabbar>

    <!-- ai对话-->
    <button type="button" class="fab" aria-label="AI 对话" @click="showDevelopingToast">
      <van-icon name="chat-o" size="26" color="#fff" />
    </button>
  </div>
</template>

<style scoped>
.tabbar-container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 100;
}

.app-tabbar {
  --van-tabbar-height: 64px;
  --van-tabbar-item-icon-size: 26px;
  --van-tabbar-item-font-size: 13px;

  mask: radial-gradient(
    32px at 50% 0,
    transparent 99%, #ebedf0 102%
  );
}

.app-tabbar :deep(.van-tabbar-item) {
  min-height: 64px;
}

.fab {
  position: absolute;
  top: -27px;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateX(-50%);
  width: 54px;
  height: 54px;
  background: linear-gradient(135deg, #73a9ff 0%, #24bba9 100%);
  border-radius: 50%;
  border: 1px solid #60a5fa;
  box-shadow: 0 10px 24px rgb(20 184 166 / 30%);
  outline: none;
  cursor: pointer;
}
</style>
