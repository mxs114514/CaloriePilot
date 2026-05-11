<script setup lang="ts">
import { PieChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, reactive } from 'vue'
import VChart from 'vue-echarts'

use([CanvasRenderer, LegendComponent, PieChart, TooltipComponent])

const targetCalories = 1800

const mealForm = reactive({
  breakfast: '',
  dinner: '',
  lunch: '',
  snack: '',
})

const parseCalories = (value: string) => Number(value || 0)

const mealCalories = computed(() => ({
  breakfast: parseCalories(mealForm.breakfast),
  dinner: parseCalories(mealForm.dinner),
  lunch: parseCalories(mealForm.lunch),
  snack: parseCalories(mealForm.snack),
}))

const totalCalories = computed(() => {
  return (
    mealCalories.value.breakfast +
    mealCalories.value.lunch +
    mealCalories.value.dinner +
    mealCalories.value.snack
  )
})

const progressPercent = computed(() => {
  if (targetCalories <= 0) {
    return 0
  }

  return Math.round((totalCalories.value / targetCalories) * 100)
})

const chartData = computed(() => {
  const meals = [
    { itemStyle: { color: '#A7F3D0' }, name: '早餐', value: mealCalories.value.breakfast },
    { itemStyle: { color: '#FDE68A' }, name: '中餐', value: mealCalories.value.lunch },
    { itemStyle: { color: '#FDBA74' }, name: '晚餐', value: mealCalories.value.dinner },
    { itemStyle: { color: '#BFDBFE' }, name: '加餐/零食', value: mealCalories.value.snack },
  ]

  const remainingCalories = Math.max(targetCalories - totalCalories.value, 0)

  return [
    ...meals,
    {
      itemStyle: { color: '#E5E7EB' },
      name: '剩余目标',
      value: totalCalories.value === 0 ? targetCalories : remainingCalories,
    },
  ]
})

const chartOption = computed(() => ({
  legend: {
    bottom: 0,
    itemGap: 14,
  },
  series: [
    {
      avoidLabelOverlap: true,
      data: chartData.value,
      label: {
        show: false,
      },
      radius: ['62%', '82%'],
      type: 'pie',
    },
  ],
  tooltip: {
    formatter: '{b}: {c} kcal',
    trigger: 'item',
  },
}))
</script>

<template>
  <main class="page-shell record-page">
    <section class="record-page__chart-section">
      <div class="record-page__chart">
        <VChart :option="chartOption" autoresize />
        <div class="record-page__chart-center">
          <strong>{{ totalCalories }}</strong>
          <span>/ {{ targetCalories }} kcal</span>
          <em>{{ progressPercent }}%</em>
        </div>
      </div>
    </section>

    <van-form>
      <van-cell-group title="今日摄入" inset>
        <van-field v-model="mealForm.breakfast" label="早餐" type="digit" maxlength="4" placeholder="请输入热量" />
        <van-field v-model="mealForm.lunch" label="中餐" type="digit" maxlength="4" placeholder="请输入热量" />
        <van-field v-model="mealForm.dinner" label="晚餐" type="digit" maxlength="4" placeholder="请输入热量" />
        <van-field v-model="mealForm.snack" label="加餐/零食" type="digit" maxlength="4" placeholder="请输入热量" />
      </van-cell-group>
    </van-form>
  </main>
</template>

<style scoped>
.record-page {
  background: #f7f8fa;
  padding-top: 16px;
}

.record-page__chart-section {
  padding: 0 16px 8px;
}

.record-page__chart {
  position: relative;
  height: 280px;
}

.record-page__chart-center {
  position: absolute;
  top: 42%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
}

.record-page__chart-center strong {
  color: #111827;
  font-size: 28px;
  font-weight: 700;
  line-height: 32px;
}

.record-page__chart-center span {
  margin-top: 2px;
  color: #6b7280;
  font-size: 13px;
  line-height: 18px;
}

.record-page__chart-center em {
  margin-top: 6px;
  color: #10b981;
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  line-height: 20px;
}
</style>
