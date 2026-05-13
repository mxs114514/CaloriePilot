import type { DailyPlanHistoryItem } from '@/utils/planHistory'

type HistoryValueKey = 'calories' | 'weightKg'

interface HistoryLineChartYAxis {
  min?: number
  name: string
  scale?: boolean
}

interface BuildHistoryLineChartOptionInput {
  color: string
  items: DailyPlanHistoryItem[]
  unit: string
  valueKey: HistoryValueKey
  yAxis: HistoryLineChartYAxis
}

const MIN_CHART_WIDTH = 320
const CHART_WIDTH_PER_POINT = 56

export const buildHistoryLineChartOption = ({
  color,
  items,
  unit,
  valueKey,
  yAxis,
}: BuildHistoryLineChartOptionInput) => ({
  grid: {
    bottom: 40,
    left: 52,
    right: 20,
    top: 20,
  },
  series: [
    {
      connectNulls: false,
      data: items.map(item => item[valueKey]),
      itemStyle: {
        color,
      },
      lineStyle: {
        color,
        width: 3,
      },
      showSymbol: true,
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      type: 'line',
    },
  ],
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value: number | string) =>
      typeof value === 'number' ? `${value} ${unit}` : '--',
  },
  xAxis: {
    axisLabel: {
      color: '#6b7280',
    },
    axisLine: {
      lineStyle: {
        color: '#d1d5db',
      },
    },
    boundaryGap: false,
    data: items.map(item => formatHistoryAxisDate(item.date)),
    type: 'category',
  },
  yAxis: {
    axisLabel: {
      color: '#6b7280',
    },
    name: yAxis.name,
    min: yAxis.min,
    scale: yAxis.scale ?? false,
    splitLine: {
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    type: 'value',
  },
})

export const getHistoryChartMinWidth = (points: number) =>
  Math.max(MIN_CHART_WIDTH, points * CHART_WIDTH_PER_POINT)

const formatHistoryAxisDate = (date: string) => date.slice(5)
