<script setup lang="ts">
import type { DailyPlanHistoryItem } from '@/utils/planHistory'

import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'

import { getCurrentPlanHistory } from '@/services/planHistory'
import { useProfileStore } from '@/stores/profile'
import { getActivePlanHistoryRange } from '@/utils/planHistory'

const profileStore = useProfileStore()
const { activePlan } = storeToRefs(profileStore)

const historyItems = ref<DailyPlanHistoryItem[]>([])
const isLoading = ref(false)
const loadError = ref('')

const hasCurrentPlan = computed(() => Boolean(activePlan.value))
const rangeText = computed(() => {
  if (!activePlan.value) return ''

  const range = getActivePlanHistoryRange(activePlan.value)

  return `${range.startDate} 至 ${range.endDate}`
})

const loadHistory = async () => {
  if (!profileStore.isInitialized) {
    await profileStore.loadInitialData()
  }

  if (!activePlan.value) {
    historyItems.value = []
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    historyItems.value = await getCurrentPlanHistory(activePlan.value)
  } catch (error) {
    console.error('Failed to load plan history', error)
    loadError.value = '历史记录加载失败'
  } finally {
    isLoading.value = false
  }
}

const formatCalories = (item: DailyPlanHistoryItem) =>
  item.calories === null ? '' : `${item.calories} kcal`

const formatWeight = (item: DailyPlanHistoryItem) =>
  item.weightKg === null ? '' : `${item.weightKg.toFixed(2)} kg`

onMounted(() => {
  void loadHistory()
})
</script>

<template>
  <main class="page-shell history-page">
    <header class="history-page__header">
      <h1>当前计划历史</h1>
      <p v-if="activePlan">{{ rangeText }}</p>
    </header>

    <van-skeleton v-if="isLoading" title :row="4" class="history-page__skeleton" />

    <van-empty v-else-if="!hasCurrentPlan" description="暂无当前计划" />

    <van-empty v-else-if="loadError" :description="loadError" />

    <section v-else class="history-page__table-section" aria-label="当前计划每日历史">
      <div class="history-page__table-scroll">
        <table class="history-page__table">
          <tbody>
            <tr>
              <th scope="row">时间</th>
              <td v-for="item in historyItems" :key="`date-${item.date}`">
                {{ item.date }}
              </td>
            </tr>
            <tr>
              <th scope="row">热量摄入</th>
              <td v-for="item in historyItems" :key="`calories-${item.date}`">
                {{ formatCalories(item) }}
              </td>
            </tr>
            <tr>
              <th scope="row">体重</th>
              <td v-for="item in historyItems" :key="`weight-${item.date}`">
                {{ formatWeight(item) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped>
.history-page {
  background: #f7f8fa;
  padding: 18px 16px calc(66px + env(safe-area-inset-bottom));
}

.history-page__header {
  margin-bottom: 16px;
}

.history-page__header h1 {
  margin: 0;
  color: #111827;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.35;
}

.history-page__header p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.history-page__skeleton {
  padding: 16px;
}

.history-page__table-section {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.history-page__table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.history-page__table {
  width: max-content;
  border-collapse: collapse;
  table-layout: fixed;
}

.history-page__table th,
.history-page__table td {
  width: 96px;
  min-width: 96px;
  max-width: 96px;
  height: 52px;
  padding: 8px;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
  font-size: 13px;
  line-height: 1.3;
  text-align: center;
  vertical-align: middle;
  word-break: break-word;
}

.history-page__table th {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #f9fafb;
  color: #374151;
  font-weight: 700;
}

.history-page__table tr:last-child th,
.history-page__table tr:last-child td {
  border-bottom: 0;
}

.history-page__table th:last-child,
.history-page__table td:last-child {
  border-right: 0;
}
</style>
