<script setup lang="ts">
import type { SavedAiPlan, SavedMeal, SavedWorkout } from '@/types'

import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  addSavedMeal,
  addSavedWorkout,
  deleteSavedMeal,
  deleteSavedWorkout,
  getCurrentOrPendingSavedAiPlan,
  toggleSavedMealCompletion,
  toggleSavedWorkoutCompletion,
  updateSavedMeal,
  updateSavedWorkout,
} from '@/services/savedAiPlans'

import {
  buildPlanPageViewState,
  getDefaultActiveDayNames,
  updateMealCompletionInPlan,
  updateWorkoutCompletionInPlan,
} from './planPageViewState'

const savedPlan = ref<SavedAiPlan | null>(null)
const isLoading = ref(false)
const activeTab = ref<'meals' | 'workouts'>('meals')
const activeMealDayNames = ref<number[]>([])
const activeWorkoutDayNames = ref<number[]>([])

const mealDialog = reactive({
  calories: '',
  dayIndex: 1,
  description: '',
  id: '',
  mode: 'add' as 'add' | 'edit',
  show: false,
  title: '',
})
const workoutDialog = reactive({
  caloriesBurned: '',
  dayIndex: 1,
  description: '',
  durationMinutes: '',
  id: '',
  mode: 'add' as 'add' | 'edit',
  show: false,
  title: '',
})

const viewState = computed(() =>
  savedPlan.value ? buildPlanPageViewState(savedPlan.value) : null,
)

const loadSavedPlan = async ({ showLoading = false } = {}) => {
  if (showLoading) isLoading.value = true
  try {
    const plan = await getCurrentOrPendingSavedAiPlan()
    savedPlan.value = plan

    if (plan && activeMealDayNames.value.length === 0) {
      const defaultActiveDayNames = getDefaultActiveDayNames(plan)
      activeMealDayNames.value = defaultActiveDayNames
      activeWorkoutDayNames.value = defaultActiveDayNames
    }
  } catch (error) {
    console.error('加载 AI 计划失败', error)
    showFailToast('加载计划失败')
  } finally {
    if (showLoading) isLoading.value = false
  }
}

const toggleMeal = async (dayIndex: number, meal: SavedMeal) => {
  if (!savedPlan.value) return

  const previousPlan = savedPlan.value
  const isCompleted = !meal.isCompleted
  const completedAt = new Date().toISOString()
  savedPlan.value = updateMealCompletionInPlan(
    previousPlan,
    dayIndex,
    meal.id,
    isCompleted,
    completedAt,
  )

  try {
    await toggleSavedMealCompletion(savedPlan.value.id, dayIndex, meal.id)
  } catch (error) {
    savedPlan.value = previousPlan
    console.error('切换饮食完成状态失败', error)
    showFailToast('更新失败')
  }
}

const toggleWorkout = async (dayIndex: number, workout: SavedWorkout) => {
  if (!savedPlan.value) return

  const previousPlan = savedPlan.value
  const isCompleted = !workout.isCompleted
  const completedAt = new Date().toISOString()
  savedPlan.value = updateWorkoutCompletionInPlan(
    previousPlan,
    dayIndex,
    workout.id,
    isCompleted,
    completedAt,
  )

  try {
    await toggleSavedWorkoutCompletion(savedPlan.value.id, dayIndex, workout.id)
  } catch (error) {
    savedPlan.value = previousPlan
    console.error('切换运动完成状态失败', error)
    showFailToast('更新失败')
  }
}

const openAddMealDialog = (dayIndex: number) => {
  Object.assign(mealDialog, {
    calories: '',
    dayIndex,
    description: '',
    id: '',
    mode: 'add',
    show: true,
    title: '',
  })
}

const openEditMealDialog = (dayIndex: number, meal: SavedMeal) => {
  Object.assign(mealDialog, {
    calories: String(meal.calories),
    dayIndex,
    description: meal.description,
    id: meal.id,
    mode: 'edit',
    show: true,
    title: meal.title,
  })
}

const openAddWorkoutDialog = (dayIndex: number) => {
  Object.assign(workoutDialog, {
    caloriesBurned: '',
    dayIndex,
    description: '',
    durationMinutes: '',
    id: '',
    mode: 'add',
    show: true,
    title: '',
  })
}

const openEditWorkoutDialog = (dayIndex: number, workout: SavedWorkout) => {
  Object.assign(workoutDialog, {
    caloriesBurned: String(workout.caloriesBurned),
    dayIndex,
    description: workout.description,
    durationMinutes: String(workout.durationMinutes),
    id: workout.id,
    mode: 'edit',
    show: true,
    title: workout.title,
  })
}

const submitMealDialog = async () => {
  if (!savedPlan.value) return

  const calories = Number(mealDialog.calories)
  if (!mealDialog.title.trim() || !mealDialog.description.trim() || !Number.isFinite(calories)) {
    showFailToast('请完整填写饮食信息')
    return
  }

  try {
    if (mealDialog.mode === 'add') {
      await addSavedMeal(savedPlan.value.id, mealDialog.dayIndex, {
        calories,
        description: mealDialog.description.trim(),
        title: mealDialog.title.trim(),
      })
    } else {
      await updateSavedMeal(savedPlan.value.id, mealDialog.dayIndex, mealDialog.id, {
        calories,
        description: mealDialog.description.trim(),
        title: mealDialog.title.trim(),
      })
    }

    mealDialog.show = false
    showSuccessToast('已保存')
    await loadSavedPlan()
  } catch (error) {
    console.error('保存饮食失败', error)
    showFailToast(error instanceof Error ? error.message : '保存失败')
  }
}

const submitWorkoutDialog = async () => {
  if (!savedPlan.value) return

  const durationMinutes = Number(workoutDialog.durationMinutes)
  const caloriesBurned = Number(workoutDialog.caloriesBurned)
  if (
    !workoutDialog.title.trim() ||
    !workoutDialog.description.trim() ||
    !Number.isFinite(durationMinutes) ||
    !Number.isFinite(caloriesBurned)
  ) {
    showFailToast('请完整填写运动信息')
    return
  }

  try {
    if (workoutDialog.mode === 'add') {
      await addSavedWorkout(savedPlan.value.id, workoutDialog.dayIndex, {
        caloriesBurned,
        description: workoutDialog.description.trim(),
        durationMinutes,
        title: workoutDialog.title.trim(),
      })
    } else {
      await updateSavedWorkout(savedPlan.value.id, workoutDialog.dayIndex, workoutDialog.id, {
        caloriesBurned,
        description: workoutDialog.description.trim(),
        durationMinutes,
        title: workoutDialog.title.trim(),
      })
    }

    workoutDialog.show = false
    showSuccessToast('已保存')
    await loadSavedPlan()
  } catch (error) {
    console.error('保存运动失败', error)
    showFailToast(error instanceof Error ? error.message : '保存失败')
  }
}

const confirmDeleteMeal = async (dayIndex: number, meal: SavedMeal) => {
  if (!savedPlan.value) return

  try {
    await showConfirmDialog({
      message: `删除「${meal.title}」？`,
      title: '删除饮食',
    })
    await deleteSavedMeal(savedPlan.value.id, dayIndex, meal.id)
    showSuccessToast('已删除')
    await loadSavedPlan()
  } catch {
    // 用户取消删除时不需要提示。
  }
}

const confirmDeleteWorkout = async (dayIndex: number, workout: SavedWorkout) => {
  if (!savedPlan.value) return

  try {
    await showConfirmDialog({
      message: `删除「${workout.title}」？`,
      title: '删除运动',
    })
    await deleteSavedWorkout(savedPlan.value.id, dayIndex, workout.id)
    showSuccessToast('已删除')
    await loadSavedPlan()
  } catch {
    // 用户取消删除时不需要提示。
  }
}

onMounted(() => loadSavedPlan({ showLoading: true }))
</script>

<template>
  <main class="page-shell plan-page">
    <van-loading v-if="isLoading" class="plan-page__loading" />

    <van-empty
      v-else-if="!savedPlan || !viewState"
      class="plan-page__empty"
      image="search"
      description="暂无已保存 AI 计划"
    />

    <section v-else class="plan-page__content">
      <header class="plan-summary">
        <div class="plan-summary__title-row">
          <div>
            <p class="plan-summary__eyebrow">当前计划</p>
            <h1>{{ savedPlan.title }}</h1>
          </div>
          <van-tag round type="primary">{{ viewState.summary.statusText }}</van-tag>
        </div>
        <p class="plan-summary__subtitle">{{ viewState.summary.subtitle }}</p>
        <div class="plan-summary__progress">
          <div class="plan-summary__progress-text">
            <span>完成进度</span>
            <strong>
              {{ viewState.summary.completedCount }}/{{ viewState.summary.totalCount }}
            </strong>
          </div>
          <van-progress
            :percentage="viewState.summary.completionPercent"
            stroke-width="8"
            color="#1989fa"
          />
        </div>
      </header>

      <van-tabs v-model:active="activeTab" class="plan-tabs" shrink animated>
        <van-tab title="饮食计划" name="meals">
          <van-collapse v-model="activeMealDayNames" class="plan-day-list">
            <van-collapse-item
              v-for="day in viewState.mealDays"
              :key="day.dayIndex"
              :name="day.dayIndex"
            >
              <template #title>
                <div class="day-title">
                  <span>第 {{ day.dayIndex }} 天</span>
                  <small>{{ day.items.length }} 餐 · {{ day.totalCalories }} kcal</small>
                </div>
              </template>

              <div class="day-actions">
                <van-button
                  size="small"
                  plain
                  type="primary"
                  icon="plus"
                  @click.stop="openAddMealDialog(day.dayIndex)"
                >
                  新增加餐
                </van-button>
              </div>

              <van-cell-group class="plan-list" :border="false">
                <van-swipe-cell v-for="meal in day.items" :key="meal.id">
                  <van-cell center class="plan-list__item" :border="false">
                    <template #icon>
                      <van-checkbox
                        :model-value="meal.isCompleted"
                        @click.stop="toggleMeal(day.dayIndex, meal)"
                      />
                    </template>
                    <template #title>
                      <div class="item-title">
                        <van-tag plain type="primary">{{ meal.mealTypeText }}</van-tag>
                        <span :class="{ 'is-completed': meal.isCompleted }">{{ meal.title }}</span>
                      </div>
                    </template>
                    <template #label>
                      <p class="item-description">{{ meal.description }}</p>
                      <p class="item-meta">{{ meal.calories }} kcal</p>
                    </template>
                  </van-cell>
                  <template #right>
                    <div class="swipe-actions">
                      <van-button
                        square
                        type="primary"
                        icon="edit"
                        @click="openEditMealDialog(day.dayIndex, meal)"
                      />
                      <van-button
                        square
                        type="danger"
                        icon="delete-o"
                        @click="confirmDeleteMeal(day.dayIndex, meal)"
                      />
                    </div>
                  </template>
                </van-swipe-cell>
              </van-cell-group>
            </van-collapse-item>
          </van-collapse>
        </van-tab>

        <van-tab title="运动计划" name="workouts">
          <van-collapse v-model="activeWorkoutDayNames" class="plan-day-list">
            <van-collapse-item
              v-for="day in viewState.workoutDays"
              :key="day.dayIndex"
              :name="day.dayIndex"
            >
              <template #title>
                <div class="day-title">
                  <span>第 {{ day.dayIndex }} 天</span>
                  <small>
                    {{ day.items.length }} 项 · {{ day.totalDurationMinutes }} 分钟 ·
                    {{ day.totalCaloriesBurned }} kcal
                  </small>
                </div>
              </template>

              <div class="day-actions">
                <van-button
                  size="small"
                  plain
                  type="primary"
                  icon="plus"
                  @click.stop="openAddWorkoutDialog(day.dayIndex)"
                >
                  新增运动
                </van-button>
              </div>

              <van-empty
                v-if="day.items.length === 0"
                class="day-empty"
                image="search"
                description="当天暂无运动安排"
              />

              <van-cell-group v-else class="plan-list" :border="false">
                <van-swipe-cell v-for="workout in day.items" :key="workout.id">
                  <van-cell center class="plan-list__item" :border="false">
                    <template #icon>
                      <van-checkbox
                        :model-value="workout.isCompleted"
                        @click.stop="toggleWorkout(day.dayIndex, workout)"
                      />
                    </template>
                    <template #title>
                      <div class="item-title">
                        <span :class="{ 'is-completed': workout.isCompleted }">
                          {{ workout.title }}
                        </span>
                      </div>
                    </template>
                    <template #label>
                      <p class="item-description">{{ workout.description }}</p>
                      <p class="item-meta">
                        {{ workout.durationMinutes }} 分钟 · 消耗 {{ workout.caloriesBurned }} kcal
                      </p>
                    </template>
                  </van-cell>
                  <template #right>
                    <div class="swipe-actions">
                      <van-button
                        square
                        type="primary"
                        icon="edit"
                        @click="openEditWorkoutDialog(day.dayIndex, workout)"
                      />
                      <van-button
                        square
                        type="danger"
                        icon="delete-o"
                        @click="confirmDeleteWorkout(day.dayIndex, workout)"
                      />
                    </div>
                  </template>
                </van-swipe-cell>
              </van-cell-group>
            </van-collapse-item>
          </van-collapse>
        </van-tab>
      </van-tabs>
    </section>

    <van-dialog
      v-model:show="mealDialog.show"
      :title="mealDialog.mode === 'add' ? '新增加餐' : '编辑饮食'"
      show-cancel-button
      @confirm="submitMealDialog"
    >
      <van-cell-group inset>
        <van-field v-model="mealDialog.title" label="名称" />
        <van-field v-model="mealDialog.description" label="内容" type="textarea" autosize />
        <van-field v-model="mealDialog.calories" label="热量" type="number" />
      </van-cell-group>
    </van-dialog>

    <van-dialog
      v-model:show="workoutDialog.show"
      :title="workoutDialog.mode === 'add' ? '新增运动' : '编辑运动'"
      show-cancel-button
      @confirm="submitWorkoutDialog"
    >
      <van-cell-group inset>
        <van-field v-model="workoutDialog.title" label="名称" />
        <van-field v-model="workoutDialog.description" label="说明" type="textarea" autosize />
        <van-field v-model="workoutDialog.durationMinutes" label="分钟" type="number" />
        <van-field v-model="workoutDialog.caloriesBurned" label="消耗" type="number" />
      </van-cell-group>
    </van-dialog>
  </main>
</template>

<style scoped>
.plan-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 14px 14px calc(88px + env(safe-area-inset-bottom));
  background: #f6f7f9;
}

.plan-page__loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.plan-page__empty {
  margin: auto;
}

.plan-page__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-summary {
  padding: 16px;
  color: #172033;
  background: #fff;
  border: 1px solid #ebedf0;
  border-radius: 8px;
}

.plan-summary__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.plan-summary__eyebrow {
  margin: 0 0 5px;
  color: #1989fa;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.plan-summary h1 {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
  letter-spacing: 0;
}

.plan-summary__subtitle {
  margin: 8px 0 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.5;
}

.plan-summary__progress {
  margin-top: 14px;
}

.plan-summary__progress-text {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #667085;
  font-size: 13px;
}

.plan-summary__progress-text strong {
  color: #172033;
  font-weight: 700;
}

.plan-tabs {
  overflow: hidden;
  background: #fff;
  border: 1px solid #ebedf0;
  border-radius: 8px;
}

.plan-tabs :deep(.van-tabs__wrap) {
  border-bottom: 1px solid #f0f1f3;
}

.plan-tabs :deep(.van-tabs__content) {
  background: #fff;
}

.plan-day-list :deep(.van-collapse-item__title) {
  align-items: center;
}

.plan-day-list :deep(.van-collapse-item__content) {
  padding: 0 12px 12px;
  background: #fff;
}

.day-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.day-title span {
  color: #172033;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.day-title small {
  color: #667085;
  font-size: 12px;
  line-height: 1.35;
}

.day-actions {
  display: flex;
  justify-content: flex-end;
  padding: 2px 0 10px;
}

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: transparent;
}

.plan-list__item {
  min-height: 72px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #edf0f3;
  border-radius: 8px;
}

.plan-list__item :deep(.van-cell__title) {
  min-width: 0;
}

.plan-list__item :deep(.van-cell__label) {
  margin-top: 5px;
}

.plan-list__item :deep(.van-checkbox) {
  margin-right: 10px;
}

.item-title {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
  color: #172033;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.item-title span:last-child {
  min-width: 0;
  overflow-wrap: anywhere;
}

.item-description {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.item-meta {
  margin: 4px 0 0;
  color: #1989fa;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}

.is-completed {
  color: #98a2b3;
  text-decoration: line-through;
}

.swipe-actions {
  display: flex;
  height: 100%;
}

.swipe-actions .van-button {
  height: 100%;
}

.day-empty {
  padding: 12px 0 4px;
}

.day-empty :deep(.van-empty__image) {
  width: 72px;
  height: 72px;
}
</style>
