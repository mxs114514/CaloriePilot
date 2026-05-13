<script setup lang="ts">
import type { DailyPlanHistoryItem } from '@/utils/planHistory'

import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'

import { getCurrentPlanHistory } from '@/services/planHistory'
import { useProfileStore } from '@/stores/profile'
import { getActivePlanHistoryRange } from '@/utils/planHistory'

import { buildHistoryLineChartOption, getHistoryChartMinWidth } from './historyCharts'

use([CanvasRenderer, GridComponent, LineChart, TooltipComponent])

const profileStore = useProfileStore()
const { activePlan } = storeToRefs(profileStore)

const historyItems = ref<DailyPlanHistoryItem[]>([])
const isLoading = ref(false)
const loadError = ref('')

const hasCurrentPlan = computed(() => Boolean(activePlan.value))
const chartMinWidth = computed(() => `${getHistoryChartMinWidth(historyItems.value.length)}px`)
const rangeText = computed(() => {
  if (!activePlan.value) return ''

  const range = getActivePlanHistoryRange(activePlan.value)

  return `${range.startDate} 至 ${range.endDate}`
})

const calorieChartOption = computed(() =>
  buildHistoryLineChartOption({
    color: '#10b981',
    items: historyItems.value,
    unit: 'kcal',
    valueKey: 'calories',
    yAxis: {
      min: 0,
      name: '每日摄入 (kcal)',
    },
  }),
)

const weightChartOption = computed(() =>
  buildHistoryLineChartOption({
    color: '#3b82f6',
    items: historyItems.value,
    unit: 'kg',
    valueKey: 'weightKg',
    yAxis: {
      name: '每日体重 (kg)',
      scale: true,
    },
  }),
)

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

    <section v-else class="history-page__charts" aria-label="当前计划每日历史趋势">
      <article class="history-page__chart-panel">
        <div class="history-page__chart-header">
          <h2>每日摄入</h2>
          <p>按天汇总当前计划的热量摄入</p>
        </div>
        <div class="history-page__chart-scroll">
          <div class="history-page__chart-canvas" :style="{ minWidth: chartMinWidth }">
            <VChart :option="calorieChartOption" autoresize class="history-page__chart" />
          </div>
        </div>
      </article>

      <article class="history-page__chart-panel">
        <div class="history-page__chart-header">
          <h2>每日体重</h2>
          <p>同一天内存在多条记录时，展示最新体重</p>
        </div>
        <div class="history-page__chart-scroll">
          <div class="history-page__chart-canvas" :style="{ minWidth: chartMinWidth }">
            <VChart :option="weightChartOption" autoresize class="history-page__chart" />
          </div>
        </div>
      </article>
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

.history-page__charts {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-page__chart-panel {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.history-page__chart-header {
  padding: 16px 16px 0;
}

.history-page__chart-header h2 {
  margin: 0;
  color: #111827;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.history-page__chart-header p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

.history-page__chart-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.history-page__chart-canvas {
  padding: 8px 0 12px;
}

.history-page__chart {
  height: 260px;
}
</style>
