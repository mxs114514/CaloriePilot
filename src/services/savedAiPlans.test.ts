import type { AiGeneratedPlan, SavedAiPlan } from '@/types'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => {
  let savedAiPlans: SavedAiPlan[] = []

  return {
    db: {
      savedAiPlans: {
        add: vi.fn((plan: SavedAiPlan) => {
          savedAiPlans.push(plan)
          return Promise.resolve(plan.id)
        }),
        put: vi.fn((plan: SavedAiPlan) => {
          const index = savedAiPlans.findIndex(item => item.id === plan.id)
          if (index >= 0) {
            savedAiPlans[index] = plan
          } else {
            savedAiPlans.push(plan)
          }
          return Promise.resolve(plan.id)
        }),
        toArray: vi.fn(() => Promise.resolve([...savedAiPlans])),
      },
      transaction: vi.fn((_mode: string, ...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<unknown>

        return callback()
      }),
    },
    getSavedAiPlans: () => savedAiPlans,
    reset: () => {
      savedAiPlans = []
    },
    setSavedAiPlans: (plans: SavedAiPlan[]) => {
      savedAiPlans = plans
    },
  }
})

vi.mock('@/db', () => ({
  db: dbMock.db,
}))

import {
  addSavedMeal,
  buildSavedAiPlanFromDraft,
  calculatePlanCompletionStats,
  deleteSavedMeal,
  getCurrentOrPendingSavedAiPlan,
  saveAiPlanDraft,
  toggleSavedMealCompletion,
  toggleSavedWorkoutCompletion,
  updateSavedMeal,
} from './savedAiPlans'

describe('保存后 AI 计划服务', () => {
  beforeEach(() => {
    dbMock.reset()
  })

  it('将 AI 草案转换为保存后计划', () => {
    const plan = buildSavedAiPlanFromDraft(makeDraftPlan(), {
      createId: createSequenceId('id'),
      getToday: () => '2026-05-20',
    })

    expect(plan).toMatchObject({
      durationDays: 1,
      goal: '轻量减脂',
      id: 'id-1',
      startDate: '2026-05-20',
      status: 'active',
      title: '1 天轻量减脂计划',
    })
    expect(plan.days[0]?.meals[0]).toMatchObject({
      id: 'id-2',
      isCompleted: false,
      mealType: 'breakfast',
      source: 'ai',
      title: '燕麦鸡蛋餐',
    })
    expect(plan.days[0]?.workouts[0]).toMatchObject({
      id: 'id-5',
      isCompleted: false,
      source: 'ai',
      title: '快走',
    })
  })

  it('未注入 createId 时通过 crypto 上下文生成默认 ID', () => {
    const originalCrypto = globalThis.crypto
    const cryptoMock = {
      randomUUID: vi.fn(function (this: Crypto) {
        if (this !== cryptoMock) {
          throw new TypeError('Illegal invocation')
        }

        return 'browser-id'
      }),
    } as unknown as Crypto
    vi.stubGlobal('crypto', cryptoMock)

    try {
      const plan = buildSavedAiPlanFromDraft(makeDraftPlan(), {
        getToday: () => '2026-05-20',
      })

      expect(plan.id).toBe('browser-id')
      expect(cryptoMock.randomUUID).toHaveBeenCalled()
    } finally {
      vi.stubGlobal('crypto', originalCrypto)
    }
  })

  it('保存新计划时归档已有 active 和 pending 计划', async () => {
    dbMock.setSavedAiPlans([
      makeSavedPlan({ id: 'active-plan', status: 'active' }),
      makeSavedPlan({ id: 'pending-plan', status: 'pending', startDate: '2026-05-25' }),
      makeSavedPlan({ id: 'completed-plan', status: 'completed', startDate: '2026-05-01' }),
    ])

    const savedPlan = await saveAiPlanDraft(makeDraftPlan(), {
      createId: createSequenceId('new'),
      getToday: () => '2026-05-19',
      getNow: () => '2026-05-19T08:00:00.000Z',
    })

    expect(savedPlan.status).toBe('pending')
    expect(dbMock.getSavedAiPlans()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'active-plan', status: 'archived' }),
        expect.objectContaining({ id: 'pending-plan', status: 'archived' }),
        expect.objectContaining({ id: 'completed-plan', status: 'completed' }),
        expect.objectContaining({ id: 'new-1', status: 'pending' }),
      ]),
    )
  })

  it('拒绝保存开始日期早于今天的计划', async () => {
    await expect(
      saveAiPlanDraft(
        {
          ...makeDraftPlan(),
          startDate: '2026-05-18',
        },
        {
          createId: createSequenceId('new'),
          getToday: () => '2026-05-19',
        },
      ),
    ).rejects.toThrow('新计划开始日期不能早于今天')
  })

  it('计算计划完成率', () => {
    const plan = makeSavedPlan({
      days: [
        {
          dayIndex: 1,
          meals: [
            makeSavedMeal({ id: 'meal-1', isCompleted: true }),
            makeSavedMeal({ id: 'meal-2', mealType: 'lunch' }),
            makeSavedMeal({ id: 'meal-3', mealType: 'dinner' }),
          ],
          workouts: [makeSavedWorkout({ id: 'workout-1' })],
        },
      ],
    })

    expect(calculatePlanCompletionStats(plan)).toEqual({
      completedCount: 1,
      completionRate: 0.25,
      totalCount: 4,
    })
  })

  it('切换饮食和运动完成状态', async () => {
    dbMock.setSavedAiPlans([makeSavedPlan({ id: 'plan-a' })])

    await expect(
      toggleSavedMealCompletion('plan-a', 1, 'breakfast', {
        getNow: () => '2026-05-20T08:00:00.000Z',
      }),
    ).resolves.toBe(true)
    await expect(
      toggleSavedWorkoutCompletion('plan-a', 1, 'workout', {
        getNow: () => '2026-05-20T09:00:00.000Z',
      }),
    ).resolves.toBe(true)

    expect(dbMock.getSavedAiPlans()[0]?.days[0]?.meals[0]).toMatchObject({
      completedAt: '2026-05-20T08:00:00.000Z',
      isCompleted: true,
    })
    expect(dbMock.getSavedAiPlans()[0]?.days[0]?.workouts[0]).toMatchObject({
      completedAt: '2026-05-20T09:00:00.000Z',
      isCompleted: true,
    })

    await expect(toggleSavedMealCompletion('plan-a', 1, 'breakfast')).resolves.toBe(false)
    expect(dbMock.getSavedAiPlans()[0]?.days[0]?.meals[0]).toMatchObject({
      completedAt: undefined,
      isCompleted: false,
    })
  })

  it('支持饮食编辑规则', async () => {
    dbMock.setSavedAiPlans([
      makeSavedPlan({
        days: [
          {
            dayIndex: 1,
            meals: [
              makeSavedMeal({
                completedAt: '2026-05-20T08:00:00.000Z',
                id: 'breakfast',
                isCompleted: true,
              }),
              makeSavedMeal({ id: 'lunch', mealType: 'lunch' }),
              makeSavedMeal({ id: 'dinner', mealType: 'dinner' }),
            ],
            workouts: [],
          },
        ],
        id: 'plan-a',
      }),
    ])

    await updateSavedMeal('plan-a', 1, 'breakfast', {
      calories: 450,
      description: '燕麦 45g、鸡蛋 1 个。',
      title: '新版早餐',
    })
    const snack = await addSavedMeal('plan-a', 1, {
      calories: 180,
      description: '苹果 1 个。',
      title: '苹果加餐',
    }, {
      createId: () => 'snack',
    })

    expect(snack.mealType).toBe('snack')
    expect(dbMock.getSavedAiPlans()[0]?.days[0]?.meals[0]).toMatchObject({
      completedAt: '2026-05-20T08:00:00.000Z',
      isCompleted: true,
      title: '新版早餐',
    })
    await expect(
      addSavedMeal('plan-a', 1, {
        calories: 420,
        description: '重复早餐。',
        mealType: 'breakfast',
        title: '重复早餐',
      }),
    ).rejects.toThrow('每天 breakfast 最多只能有一条')

    await deleteSavedMeal('plan-a', 1, 'breakfast')
    expect(dbMock.getSavedAiPlans()[0]?.days[0]?.meals.map(meal => meal.id)).toEqual([
      'lunch',
      'dinner',
      'snack',
    ])
  })

  it('查询当前或未来保存后计划时刷新状态', async () => {
    dbMock.setSavedAiPlans([
      makeSavedPlan({ id: 'old', startDate: '2026-05-01', status: 'active' }),
      makeSavedPlan({ id: 'future', startDate: '2026-05-25', status: 'pending' }),
      makeSavedPlan({ id: 'archived', status: 'archived' }),
    ])

    const plan = await getCurrentOrPendingSavedAiPlan('2026-05-20')

    expect(plan?.id).toBe('future')
    expect(dbMock.getSavedAiPlans()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'old', status: 'completed' })]),
    )
  })

  it('查询当前或未来保存后计划时 active 优先于 pending', async () => {
    dbMock.setSavedAiPlans([
      makeSavedPlan({ id: 'active', startDate: '2026-05-20', status: 'active' }),
      makeSavedPlan({ id: 'future', startDate: '2026-05-25', status: 'pending' }),
    ])

    await expect(getCurrentOrPendingSavedAiPlan('2026-05-20')).resolves.toMatchObject({
      id: 'active',
    })
  })
})

const makeDraftPlan = (): AiGeneratedPlan => ({
  days: [
    {
      dayIndex: 1,
      meals: [
        {
          calories: 420,
          description: '燕麦 40g、鸡蛋 1 个。',
          mealType: 'breakfast',
          title: '燕麦鸡蛋餐',
        },
        {
          calories: 650,
          description: '鸡胸肉 120g、米饭 150g。',
          mealType: 'lunch',
          title: '鸡胸肉米饭',
        },
        {
          calories: 420,
          description: '番茄 150g、豆腐 120g。',
          mealType: 'dinner',
          title: '番茄豆腐汤',
        },
      ],
      workouts: [
        {
          caloriesBurned: 160,
          description: '保持略微喘气的速度。',
          durationMinutes: 30,
          title: '快走',
        },
      ],
    },
  ],
  durationDays: 1,
  goal: '轻量减脂',
  startDate: '2026-05-20',
  title: '1 天轻量减脂计划',
})

const makeSavedPlan = (overrides: Partial<SavedAiPlan> = {}): SavedAiPlan => ({
  days: [
    {
      dayIndex: 1,
      meals: [
        makeSavedMeal({ id: 'breakfast' }),
        makeSavedMeal({ id: 'lunch', mealType: 'lunch' }),
        makeSavedMeal({ id: 'dinner', mealType: 'dinner' }),
      ],
      workouts: [makeSavedWorkout({ id: 'workout' })],
    },
  ],
  durationDays: 1,
  goal: '轻量减脂',
  id: 'plan-a',
  startDate: '2026-05-20',
  status: 'active',
  title: '1 天轻量减脂计划',
  ...overrides,
})

const makeSavedMeal = (
  overrides: Partial<SavedAiPlan['days'][number]['meals'][number]> = {},
): SavedAiPlan['days'][number]['meals'][number] => ({
  calories: 420,
  description: '燕麦 40g、鸡蛋 1 个。',
  id: 'meal',
  isCompleted: false,
  mealType: 'breakfast',
  source: 'ai',
  title: '燕麦鸡蛋餐',
  ...overrides,
})

const makeSavedWorkout = (
  overrides: Partial<SavedAiPlan['days'][number]['workouts'][number]> = {},
): SavedAiPlan['days'][number]['workouts'][number] => ({
  caloriesBurned: 160,
  description: '保持略微喘气的速度。',
  durationMinutes: 30,
  id: 'workout',
  isCompleted: false,
  source: 'ai',
  title: '快走',
  ...overrides,
})

const createSequenceId = (prefix: string) => {
  let index = 0

  return () => {
    index += 1

    return `${prefix}-${index}`
  }
}
