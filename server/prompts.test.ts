import type { AiChatRequest } from '../shared/ai'
import { describe, expect, it } from 'vitest'

import { buildChatMessages, buildPlanMessages, buildPlanSummaryMessages } from './prompts'

const makeRequest = (): AiChatRequest => ({
  messages: [{ content: '帮我安排明天减脂计划', role: 'user' }],
  mode: 'chat',
})

describe('AI prompt 构造', () => {
  it('聊天 prompt 支持注入知识库上下文', () => {
    const messages = buildChatMessages(makeRequest(), {
      knowledgeContext: '知识库检索结果：成年人每天摄入蔬菜 300 到 500 克。',
    })

    expect(messages[0]?.content).toContain('知识库检索结果：成年人每天摄入蔬菜 300 到 500 克。')
    expect(messages[0]?.content).toContain('如提供知识库上下文，请优先基于知识库回答')
  })

  it('计划 JSON prompt 支持注入知识库上下文且保留 JSON 结构约束', () => {
    const messages = buildPlanMessages(makeRequest(), {
      knowledgeContext: '知识库检索结果：运动建议。',
    })

    expect(messages[0]?.content).toContain('知识库检索结果：运动建议。')
    expect(messages[0]?.content).toContain('知识库只作为饮食和运动原则参考')
    expect(messages[0]?.content).toContain('请严格返回 JSON')
    expect(messages[0]?.content).toContain('"type":"plan_draft"')
  })

  it('计划摘要 prompt 支持注入知识库上下文', () => {
    const messages = buildPlanSummaryMessages(makeRequest(), {
      knowledgeContext: '知识库检索结果：摘要依据。',
    })

    expect(messages[0]?.content).toContain('知识库检索结果：摘要依据。')
  })

  it('未传 knowledgeContext 时保持兼容输出', () => {
    expect(buildChatMessages(makeRequest(), {})).toEqual(buildChatMessages(makeRequest()))
    expect(buildPlanMessages(makeRequest(), {})).toEqual(buildPlanMessages(makeRequest()))
    expect(buildPlanSummaryMessages(makeRequest(), {})).toEqual(buildPlanSummaryMessages(makeRequest()))
  })
})
