export const APP_NAME = '莫莫今天吃什么'

export const ROUTE_PAGE_TITLES = {
  'ai-chat': 'AI 对话',
  history: '历史',
  plan: '计划',
  profile: '我的',
  'profile-edit': '修改个人信息',
  record: '记录',
} as const

export const ROUTE_BACK_TARGETS = {
  'profile-edit': '/profile',
} as const

export const getPageTitleByRouteName = (routeName: string | symbol | null | undefined) =>
  typeof routeName === 'string' ? ROUTE_PAGE_TITLES[routeName as keyof typeof ROUTE_PAGE_TITLES] ?? '' : ''

export const getBackTargetByRouteName = (routeName: string | symbol | null | undefined) =>
  typeof routeName === 'string'
    ? ROUTE_BACK_TARGETS[routeName as keyof typeof ROUTE_BACK_TARGETS]
    : undefined
