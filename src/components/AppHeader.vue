<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  APP_NAME,
  getBackTargetByRouteName,
  getPageTitleByRouteName,
} from '@/router/pageTitles'

const route = useRoute()
const router = useRouter()

const pageTitle = computed(() => getPageTitleByRouteName(route.name))
const backTarget = computed(() => getBackTargetByRouteName(route.name))

const handleBack = () => {
  if (!backTarget.value) return

  if (window.history.length > 1) {
    router.back()
    return
  }

  void router.push(backTarget.value)
}
</script>

<template>
  <div class="app-header" role="banner">
    <van-nav-bar :border="false" class="app-header__bar">
      <template #left>
        <div class="app-header__brand">
          <van-image
            round
            width="40"
            height="40"
            fit="cover"
            src="/favicon.svg"
            alt="莫莫今天吃什么 Logo"
          />
          <span class="app-header__app-name">{{ APP_NAME }}</span>
        </div>
      </template>

      <template #right>
        <div v-if="pageTitle" class="app-header__page">
          <van-icon
            v-if="backTarget"
            name="arrow-left"
            size="16"
            class="app-header__back"
            @click="handleBack"
          />
          <span class="app-header__page-name">{{ pageTitle }}</span>
        </div>
      </template>
    </van-nav-bar>
  </div>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  padding-top: env(safe-area-inset-top);
  background: rgb(255 255 255 / 92%);
  border-bottom: 1px solid #e5e7eb;
  backdrop-filter: blur(16px);
}

.app-header__bar {
  background: transparent;
}

.app-header__brand,
.app-header__page {
  display: flex;
  align-items: center;
}

.app-header__brand {
  gap: 10px;
  min-width: 0;
}

.app-header__app-name,
.app-header__page-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-header__app-name {
  color: #111827;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

.app-header__page {
  gap: 6px;
  color: #4b5563;
}

.app-header__page-name {
  max-width: 110px;
  font-size: 20px;
  font-weight: 600;
}

.app-header__back {
  color: #6b7280;
  cursor: pointer;
}

.app-header :deep(.van-nav-bar__content) {
  height: 60px;
}

.app-header :deep(.van-nav-bar__left) {
  max-width: 65%;
}

.app-header :deep(.van-nav-bar__right) {
  max-width: 35%;
}
</style>
