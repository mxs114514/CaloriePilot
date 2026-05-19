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

const savedPlan = ref<SavedAiPlan | null>(null)
const isLoading = ref(false)
const activeDayNames = ref<number[]>([1])

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

const planStatusText = computed(() => {
  if (!savedPlan.value) return ''
  if (savedPlan.value.status === 'active') return '进行中'
  if (savedPlan.value.status === 'pending') return '待开始'
  if (savedPlan.value.status === 'completed') return '已结束'

  return '已归档'
})

const loadSavedPlan = async () => {
  isLoading.value = true
  try {
    savedPlan.value = await getCurrentOrPendingSavedAiPlan()
  } catch (error) {
    console.error('加载 AI 计划失败', error)
    showFailToast('加载计划失败')
  } finally {
    isLoading.value = false
  }
}

const toggleMeal = async (dayIndex: number, meal: SavedMeal) => {
  if (!savedPlan.value) return

  try {
    await toggleSavedMealCompletion(savedPlan.value.id, dayIndex, meal.id)
    await loadSavedPlan()
  } catch (error) {
    console.error('切换饮食完成状态失败', error)
    showFailToast('更新失败')
  }
}

const toggleWorkout = async (dayIndex: number, workout: SavedWorkout) => {
  if (!savedPlan.value) return

  try {
    await toggleSavedWorkoutCompletion(savedPlan.value.id, dayIndex, workout.id)
    await loadSavedPlan()
  } catch (error) {
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
    showFailToast('保存失败')
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
    await loadSavedPlan()
  } catch {
    // 用户取消删除时不需要提示。
  }
}

const formatMealType = (mealType: string) => {
  if (mealType === 'breakfast') return '早餐'
  if (mealType === 'lunch') return '午餐'
  if (mealType === 'dinner') return '晚餐'

  return '加餐'
}

onMounted(loadSavedPlan)
</script>

<template>
  <main class="page-shell plan-page">
    <van-loading v-if="isLoading" class="plan-page__loading" />

    <van-empty
      v-else-if="!savedPlan"
      image="search"
      description="暂无已保存 AI 计划"
    />

    <section v-else class="plan-page__content">
      <header class="plan-page__header">
        <div>
          <p class="plan-page__eyebrow">{{ planStatusText }}</p>
          <h1>{{ savedPlan.title }}</h1>
          <p>{{ savedPlan.goal }} · {{ savedPlan.startDate }} 开始 · {{ savedPlan.durationDays }} 天</p>
        </div>
      </header>

      <van-collapse v-model="activeDayNames">
        <van-collapse-item
          v-for="day in savedPlan.days"
          :key="day.dayIndex"
          :name="day.dayIndex"
          :title="`第 ${day.dayIndex} 天`"
        >
          <section class="plan-section">
            <div class="plan-section__header">
              <h2>饮食</h2>
              <van-button
                size="small"
                plain
                type="primary"
                icon="plus"
                @click="openAddMealDialog(day.dayIndex)"
              >
                加餐
              </van-button>
            </div>

            <van-cell
              v-for="meal in day.meals"
              :key="meal.id"
              center
              class="plan-item"
              :label="`${meal.description} · ${meal.calories} kcal`"
              :title="`${formatMealType(meal.mealType)}｜${meal.title}`"
            >
              <template #right-icon>
                <div class="plan-item__actions">
                  <van-checkbox
                    :model-value="meal.isCompleted"
                    @click.stop="toggleMeal(day.dayIndex, meal)"
                  />
                  <van-button
                    size="mini"
                    plain
                    icon="edit"
                    @click.stop="openEditMealDialog(day.dayIndex, meal)"
                  />
                  <van-button
                    size="mini"
                    plain
                    icon="delete-o"
                    @click.stop="confirmDeleteMeal(day.dayIndex, meal)"
                  />
                </div>
              </template>
            </van-cell>
          </section>

          <section class="plan-section">
            <div class="plan-section__header">
              <h2>运动</h2>
              <van-button
                size="small"
                plain
                type="primary"
                icon="plus"
                @click="openAddWorkoutDialog(day.dayIndex)"
              >
                运动
              </van-button>
            </div>

            <van-empty
              v-if="day.workouts.length === 0"
              image="search"
              description="当天暂无运动安排"
            />

            <van-cell
              v-for="workout in day.workouts"
              :key="workout.id"
              center
              class="plan-item"
              :label="`${workout.description} · ${workout.durationMinutes} 分钟 · ${workout.caloriesBurned} kcal`"
              :title="workout.title"
            >
              <template #right-icon>
                <div class="plan-item__actions">
                  <van-checkbox
                    :model-value="workout.isCompleted"
                    @click.stop="toggleWorkout(day.dayIndex, workout)"
                  />
                  <van-button
                    size="mini"
                    plain
                    icon="edit"
                    @click.stop="openEditWorkoutDialog(day.dayIndex, workout)"
                  />
                  <van-button
                    size="mini"
                    plain
                    icon="delete-o"
                    @click.stop="confirmDeleteWorkout(day.dayIndex, workout)"
                  />
                </div>
              </template>
            </van-cell>
          </section>
        </van-collapse-item>
      </van-collapse>
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
  min-height: 100vh;
  padding: 16px 16px calc(88px + env(safe-area-inset-bottom));
  background: #f7f8fa;
}

.plan-page__loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.plan-page__content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.plan-page__header {
  padding: 18px 16px;
  color: #1f2937;
  background: #fff;
  border: 1px solid #ebedf0;
  border-radius: 8px;
}

.plan-page__header h1 {
  margin: 0 0 8px;
  font-size: 22px;
  line-height: 1.25;
  letter-spacing: 0;
}

.plan-page__header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
}

.plan-page__eyebrow {
  margin-bottom: 6px !important;
  color: #1989fa !important;
  font-weight: 600;
}

.plan-section {
  padding: 8px 0 12px;
}

.plan-section + .plan-section {
  border-top: 1px solid #f0f1f3;
}

.plan-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0 8px;
}

.plan-section__header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.4;
  letter-spacing: 0;
}

.plan-item {
  padding-left: 0;
  padding-right: 0;
}

.plan-item__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-item__actions :deep(.van-button--mini) {
  width: 28px;
  height: 28px;
  padding: 0;
}
</style>
