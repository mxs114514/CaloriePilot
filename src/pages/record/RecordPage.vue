<script setup lang="ts">
import { PieChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, reactive, ref } from 'vue'
import VChart from 'vue-echarts'

use([CanvasRenderer, LegendComponent, PieChart, TooltipComponent])

const targetCalories = 1800

const mealForm = reactive({
  breakfast: '',
  dinner: '',
  lunch: '',
  snack: '',
})

const confirmedMealForm = reactive({
  breakfast: '0',
  dinner: '0',
  lunch: '0',
  snack: '0',
})

const isEditing = ref(false)
const showAddActionSheet = ref(false)
const showCascader = ref(false)

const addForm = reactive({
  mealType: '',
  calories: '',
})

const cascaderOptions = [
  { text: '早餐', value: 'breakfast' },
  { text: '中餐', value: 'lunch' },
  { text: '晚餐', value: 'dinner' },
  { text: '加餐/零食', value: 'snack' },
]

const onCascaderFinish = ({ selectedOptions }: { selectedOptions: Array<{ value: string }> }) => {
  showCascader.value = false
  const selectedOption = selectedOptions[0]
  if (selectedOption) {
    addForm.mealType = selectedOption.value
  }
}

const parseCalories = (value: string) => Number(value || 0)

const toggleEdit = () => {
  if (isEditing.value) {
    isEditing.value = false
    confirmedMealForm.breakfast = String(parseCalories(mealForm.breakfast))
    confirmedMealForm.lunch = String(parseCalories(mealForm.lunch))
    confirmedMealForm.dinner = String(parseCalories(mealForm.dinner))
    confirmedMealForm.snack = String(parseCalories(mealForm.snack))
  } else {
    isEditing.value = true
  }
}

const onAddConfirm = () => {
  if (!addForm.mealType || !addForm.calories) return
  const type = addForm.mealType as keyof typeof mealForm
  const addCals = parseCalories(addForm.calories)

  const currentCals = parseCalories(mealForm[type])
  const newCals = currentCals + addCals

  mealForm[type] = String(newCals)
  confirmedMealForm[type] = String(newCals)

  showAddActionSheet.value = false
  addForm.mealType = ''
  addForm.calories = ''
}

const mealCalories = computed(() => ({
  breakfast: parseCalories(confirmedMealForm.breakfast),
  dinner: parseCalories(confirmedMealForm.dinner),
  lunch: parseCalories(confirmedMealForm.lunch),
  snack: parseCalories(confirmedMealForm.snack),
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
          <em :class="{ 'is-over': progressPercent > 100 }">{{ progressPercent }}%</em>
        </div>
      </div>
    </section>

    <van-form>
      <van-cell-group title="今日摄入" inset>
        <van-field v-model="mealForm.breakfast" label="早餐" type="digit" maxlength="4" placeholder="请输入热量" :readonly="!isEditing" />
        <van-field v-model="mealForm.lunch" label="中餐" type="digit" maxlength="4" placeholder="请输入热量" :readonly="!isEditing" />
        <van-field v-model="mealForm.dinner" label="晚餐" type="digit" maxlength="4" placeholder="请输入热量" :readonly="!isEditing" />
        <van-field v-model="mealForm.snack" label="加餐/零食" type="digit" maxlength="4" placeholder="请输入热量" :readonly="!isEditing" />
      </van-cell-group>

      <div class="record-page__actions">
        <van-button
          round
          block
          :type="isEditing ? 'success' : 'primary'"
          :plain="!isEditing"
          class="action-btn"
          @click="toggleEdit"
        >
          {{ isEditing ? '完成修改' : '修改' }}
        </van-button>
        <van-button
          round
          block
          type="primary"
          class="action-btn"
          :disabled="isEditing"
          @click="showAddActionSheet = true"
        >
          添加
        </van-button>
      </div>
    </van-form>

    <van-action-sheet v-model:show="showAddActionSheet" title="添加饮食热量">
      <div class="record-page__sheet-content">
        <van-field
          v-model="addForm.mealType"
          is-link
          readonly
          label="餐食类型"
          placeholder="请选择"
          @click="showCascader = true"
        >
          <template #input>
            {{ cascaderOptions.find(o => o.value === addForm.mealType)?.text || '' }}
          </template>
        </van-field>
        <van-popup v-model:show="showCascader" round position="bottom">
          <van-cascader
            v-model="addForm.mealType"
            title="请选择餐食类型"
            :options="cascaderOptions"
            @close="showCascader = false"
            @finish="onCascaderFinish"
          />
        </van-popup>

        <van-field
          v-model="addForm.calories"
          label="热量(kcal)"
          type="digit"
          placeholder="请输入热量"
        />
        <div class="record-page__sheet-actions">
          <van-button round block type="primary" @click="onAddConfirm">确认添加</van-button>
        </div>
      </div>
    </van-action-sheet>

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
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
}

.record-page__chart-center em {
  color: #10b981;
  font-size: 40px;
  font-style: normal;
  font-weight: 800;
  line-height: 24px;
}

.record-page__chart-center em.is-over {
  color: #ef4444;
}

.record-page__actions {
  display: flex;
  gap: 16px;
  padding: 16px;
  margin-top: 8px;
}

.action-btn {
  flex: 1;
}

.record-page__sheet-content {
  padding: 16px 16px 32px;
}

.record-page__sheet-actions {
  margin-top: 24px;
}
</style>
