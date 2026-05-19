import type { AiChatRequest } from '../shared/ai'

/**
 * 内部使用的对话记录消息结构
 */
interface ChatCompletionMessage {
  content: string
  role: 'assistant' | 'system' | 'user'
}

/**
 * 构建用于常规“聊天交互”场景下的完整对话上下文
 * AI在其中被赋予健康计划助手的身份，同时接收用户的身高体重数据、当前计划和历史记录背景
 * @param request 包含用户资料、计划、历史记录及聊天内容的请求对象
 * @returns 组装系统 prompt 及用户对话后生成的消息数组
 */
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

/**
 * 构建用于生成“完整计划 JSON”的对话上下文
 * AI在其中被赋予特定身份，受到严格指令约束，只返回特定格式的 JSON（包含说明字段以及每日具体的饮食和运动安排）。
 * @param request AI请求参数
 * @returns 用于生成完整计划的消息数组
 */
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

/**
 * 构建用于流式返回“计划摘要”的对话上下文
 * AI在处理计划请求时，可先用来生成简短的大纲性说明给用户看。
 * 此阶段被要求不使用JSON或完整日常列表返回。
 * @param request AI请求参数
 * @returns 用于生成文字摘要的消息数组
 */
export const buildPlanSummaryMessages = (request: AiChatRequest): ChatCompletionMessage[] => [
  {
    content: [
      '你是 CaloriePilot 的健身和饮食计划生成助手。',
      '请先返回一段给用户看的计划摘要，用中文简短说明计划方向、饮食重点和运动重点。',
      '不要返回 JSON，不要包裹 Markdown 代码块，不要列出完整每日计划。',
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

/**
 * 内部辅助函数：序列化汇总用户特征、当前计划和最近历史等作为背景信息供 AI 使用
 * @param request 包含各类环境信息的 AI 请求参数
 * @returns 组合好的上下文纯文本
 */
const buildContextText = (request: AiChatRequest) =>
  [
    request.profile ? `用户资料：${JSON.stringify(request.profile)}` : '',
    request.activePlan ? `当前计划：${JSON.stringify(request.activePlan)}` : '',
    request.recentHistory ? `最近历史：${JSON.stringify(request.recentHistory)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
