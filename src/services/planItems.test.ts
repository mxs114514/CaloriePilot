import type { PlanCheckin, PlanItem } from '@/types'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => {
  let planItems: PlanItem[] = []
  let planCheckins: PlanCheckin[] = []

  return {
    db: {
      planCheckins: {
        add: vi.fn((checkin: PlanCheckin) => {
          planCheckins.push(checkin)
          return Promise.resolve(checkin.id)
        }),
        put: vi.fn((checkin: PlanCheckin) => {
          const index = planCheckins.findIndex(item => item.id === checkin.id)
          if (index >= 0) {
            planCheckins[index] = checkin
          } else {
            planCheckins.push(checkin)
          }
          return Promise.resolve(checkin.id)
        }),
        toArray: vi.fn(() => Promise.resolve([...planCheckins])),
      },
      planItems: {
        bulkPut: vi.fn((items: PlanItem[]) => {
          planItems.push(...items)
          return Promise.resolve()
        }),
        where: vi.fn((field: keyof PlanItem) => ({
          equals: vi.fn((value: string) => ({
            toArray: vi.fn(() =>
              Promise.resolve(planItems.filter(item => item[field] === value)),
            ),
          })),
        })),
      },
      transaction: vi.fn((_mode: string, ...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<unknown>

        return callback()
      }),
    },
    getPlanCheckins: () => planCheckins,
    getPlanItems: () => planItems,
    reset: () => {
      planItems = []
      planCheckins = []
    },
  }
})

vi.mock('@/db', () => ({
  db: dbMock.db,
}))

import {
  getCurrentPlanItems,
  togglePlanItemCheckin,
} from './planItems'

describe('AI 计划事项服务', () => {
  beforeEach(() => {
    dbMock.reset()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T08:00:00.000Z'))
  })

  it('按日期、天数和类型查询当前计划事项', async () => {
    dbMock.getPlanItems().push(
      makePlanItem({ date: '2026-05-20', id: 'later', type: 'habit' }),
      makePlanItem({ date: '2026-05-19', id: 'meal', type: 'meal' }),
      makePlanItem({ date: '2026-05-19', id: 'workout', type: 'workout' }),
      makePlanItem({ id: 'other-plan', planId: 'plan-b', type: 'meal' }),
    )

    await expect(getCurrentPlanItems('plan-a')).resolves.toMatchObject([
      { id: 'meal' },
      { id: 'workout' },
      { id: 'later' },
    ])
  })

  it('同一事项同一天可以完成和取消打卡', async () => {
    await expect(togglePlanItemCheckin('item-a', '2026-05-18')).resolves.toBe(true)
    expect(dbMock.getPlanCheckins()[0]).toMatchObject({
      date: '2026-05-18',
      isCompleted: true,
      planItemId: 'item-a',
    })

    await expect(togglePlanItemCheckin('item-a', '2026-05-18')).resolves.toBe(false)
    expect(dbMock.getPlanCheckins()[0]).toMatchObject({
      isCompleted: false,
      planItemId: 'item-a',
    })
  })
})

const makePlanItem = (overrides: Partial<PlanItem>): PlanItem => ({
  createdAt: '2026-05-18T08:00:00.000Z',
  id: 'item',
  planId: 'plan-a',
  source: 'ai',
  title: '事项',
  type: 'meal',
  updatedAt: '2026-05-18T08:00:00.000Z',
  ...overrides,
})
