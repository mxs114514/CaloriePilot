<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'

import AppHeader from '@/components/AppHeader.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import FirstUseDialog from '@/components/onboarding/FirstUseDialog.vue'
import { useProfileStore } from '@/stores/profile'

const profileStore = useProfileStore()
const { hasCompletedOnboarding, isInitialized } = storeToRefs(profileStore)

onMounted(() => {
  void profileStore.loadInitialData()
})
</script>

<template>
  <AppHeader />
  <RouterView />
  <AppTabbar />
  <FirstUseDialog v-if="isInitialized && !hasCompletedOnboarding" />
</template>

<style scoped></style>
