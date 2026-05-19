import { describe, expect, it } from 'vitest'

import { getAiChatComposerState, getAiDraftPlanPresentationState } from './aiChatViewState'

describe('AI 对话视图状态', () => {
  it('普通对话时只显示计划切换按钮和发送图标', () => {
    expect(
      getAiChatComposerState({
        hasDraftPlan: false,
        isPlanMode: false,
      }),
    ).toEqual({
      modeToggleIcon: 'todo-list-o',
      modeToggleText: '计划',
      sendIcon: 'guide-o',
    })
  })

  it('计划模式显示对话切换按钮和发送图标', () => {
    expect(
      getAiChatComposerState({
        hasDraftPlan: false,
        isPlanMode: true,
      }),
    ).toEqual({
      modeToggleIcon: 'chat-o',
      modeToggleText: '对话',
      sendIcon: 'play-circle-o',
    })
  })

  it('草案待确认时仍然保留当前模式切换入口', () => {
    expect(
      getAiChatComposerState({
        hasDraftPlan: true,
        isPlanMode: true,
      }),
    ).toEqual({
      modeToggleIcon: 'chat-o',
      modeToggleText: '对话',
      sendIcon: 'play-circle-o',
    })
  })

  it('有计划草案时使用悬浮入口展示计划，不在聊天流内联展示', () => {
    expect(getAiDraftPlanPresentationState({ hasDraftPlan: true })).toEqual({
      shouldShowInlinePlan: false,
      shouldShowPlanBubble: true,
    })
  })

  it('没有计划草案时不显示计划悬浮入口', () => {
    expect(getAiDraftPlanPresentationState({ hasDraftPlan: false })).toEqual({
      shouldShowInlinePlan: false,
      shouldShowPlanBubble: false,
    })
  })
})
