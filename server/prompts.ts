import type { AiChatRequest } from '../src/types/ai'

interface ChatCompletionMessage {
  content: string
  role: 'assistant' | 'system' | 'user'
}

export const buildChatMessages = (request: AiChatRequest): ChatCompletionMessage[] => [
  {
    content: [
      '你是 CaloriePilot 的健康计划助手。',
      '请基于用户资料、当前计划和最近历史，用中文给出简洁、可执行的建议。',
      '不要提供医疗诊断；遇到疾病、用药、严重不适时建议咨询专业医生。',
      buildContextText(request),
    ].join('\n'),
    role: 'system',
  },
  ...request.messages.map(message => ({
    content: message.content,
    role: message.role,
  })),
]

export const buildPlanMessages = (request: AiChatRequest): ChatCompletionMessage[] => [
  {
    content: [
      '你是 CaloriePilot 的健身和饮食计划生成助手。',
      '请严格返回 JSON，不要包裹 Markdown 代码块。',
      'JSON 格式必须是：{"content":"给用户看的简短说明","plan":{"title":"...","summary":"...","days":[{"dayIndex":1,"date":"YYYY-MM-DD 可选","meals":[],"workouts":[],"checkins":[]}]}}。',
      'meals、workouts、checkins 内每个条目至少包含 title，可选 description、calories、metadata。',
      '如果上下文包含 draftPlan，必须基于原草案和用户最新要求重新生成完整 plan，不要只返回局部修改说明。',
      buildContextText(request),
      request.draftPlan ? `当前未保存计划草案：${JSON.stringify(request.draftPlan)}` : '',
    ].join('\n'),
    role: 'system',
  },
  ...request.messages.map(message => ({
    content: message.content,
    role: message.role,
  })),
]

const buildContextText = (request: AiChatRequest) =>
  [
    request.profile ? `用户资料：${JSON.stringify(request.profile)}` : '',
    request.activePlan ? `当前计划：${JSON.stringify(request.activePlan)}` : '',
    request.recentHistory ? `最近历史：${JSON.stringify(request.recentHistory)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
