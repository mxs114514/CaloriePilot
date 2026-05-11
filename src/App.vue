<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppTabbar from '@/components/AppTabbar.vue'
import FirstUseDialog from '@/components/onboarding/FirstUseDialog.vue'
</script>

<template>
  <RouterView />
  <AppTabbar />
  <FirstUseDialog />
</template>

<style scoped></style>
