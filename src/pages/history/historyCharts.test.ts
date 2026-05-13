import type { DailyPlanHistoryItem } from '@/utils/planHistory'

import { describe, expect, it } from 'vitest'

import { buildHistoryLineChartOption, getHistoryChartMinWidth } from './historyCharts'

describe('history chart helpers', () => {
  const historyItems: DailyPlanHistoryItem[] = [
    { calories: null, date: '2026-05-10', weightKg: null },
    { calories: 1000, date: '2026-05-11', weightKg: 72.1 },
    { calories: 1350, date: '2026-05-12', weightKg: null },
  ]

  it('builds calorie line chart option with formatted dates and null gaps preserved', () => {
    const option = buildHistoryLineChartOption({
      color: '#10b981',
      items: historyItems,
      unit: 'kcal',
      valueKey: 'calories',
      yAxis: {
        min: 0,
        name: '每日摄入 (kcal)',
      },
    })

    expect(option.xAxis.data).toEqual(['05-10', '05-11', '05-12'])
    expect(option.series).toHaveLength(1)
    expect(option.series[0]).toMatchObject({
      connectNulls: false,
      data: [null, 1000, 1350],
      smooth: true,
      type: 'line',
    })
    expect(option.yAxis.min).toBe(0)
    expect(option.tooltip.trigger).toBe('axis')
  })

  it('builds weight line chart option with scale enabled for body weight values', () => {
    const option = buildHistoryLineChartOption({
      color: '#3b82f6',
      items: historyItems,
      unit: 'kg',
      valueKey: 'weightKg',
      yAxis: {
        name: '每日体重 (kg)',
        scale: true,
      },
    })

    expect(option.series[0]).toMatchObject({
      data: [null, 72.1, null],
      type: 'line',
    })
    expect(option.yAxis.scale).toBe(true)
  })

  it('expands chart width as the number of dates grows', () => {
    expect(getHistoryChartMinWidth(3)).toBe(320)
    expect(getHistoryChartMinWidth(10)).toBe(560)
  })
})
