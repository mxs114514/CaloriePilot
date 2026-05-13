import { describe, expect, it } from 'vitest'

import {
  APP_NAME,
  getBackTargetByRouteName,
  getPageTitleByRouteName,
} from './pageTitles'

describe('page title metadata', () => {
  it('uses the same titles as the tabbar for main pages', () => {
    expect(getPageTitleByRouteName('record')).toBe('记录')
    expect(getPageTitleByRouteName('plan')).toBe('计划')
    expect(getPageTitleByRouteName('history')).toBe('历史')
    expect(getPageTitleByRouteName('profile')).toBe('我的')
  })

  it('provides titles for non-tab pages', () => {
    expect(getPageTitleByRouteName('ai-chat')).toBe('AI 对话')
    expect(getPageTitleByRouteName('profile-edit')).toBe('修改个人信息')
  })

  it('returns empty title for unknown routes', () => {
    expect(getPageTitleByRouteName('unknown')).toBe('')
  })

  it('defines a back target only for sub-pages that need it', () => {
    expect(getBackTargetByRouteName('profile-edit')).toBe('/profile')
    expect(getBackTargetByRouteName('record')).toBeUndefined()
  })

  it('exposes the application name for the shared banner', () => {
    expect(APP_NAME).toBe('莫今天吃什么')
  })
})
