<script setup lang="ts">
import { ROUTE_PAGE_TITLES } from '@/router/pageTitles'
</script>

<template>
  <div class="tabbar-container">
    <van-tabbar class="app-tabbar" route safe-area-inset-bottom :fixed="false">
      <van-tabbar-item replace to="/record" icon="records-o">{{ ROUTE_PAGE_TITLES.record }}</van-tabbar-item>
      <van-tabbar-item replace to="/plan" icon="todo-list-o">{{ ROUTE_PAGE_TITLES.plan }}</van-tabbar-item>
      <van-tabbar-item replace to="/history" icon="chart-trending-o">{{ ROUTE_PAGE_TITLES.history }}</van-tabbar-item>
      <van-tabbar-item replace to="/profile" icon="user-o">{{ ROUTE_PAGE_TITLES.profile }}</van-tabbar-item>
    </van-tabbar>

    <router-link class="fab" to="/ai-chat" :aria-label="ROUTE_PAGE_TITLES['ai-chat']">
      <van-icon name="chat-o" size="26" color="#fff" />
    </router-link>
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
  text-decoration: none;
}
</style>
