import type { AiChatRequest } from '../shared/ai'

/**
 * 内部使用的对话记录消息结构
 */
interface ChatCompletionMessage {
  content: string
  role: 'assistant' | 'system' | 'user'
}

interface BuildPromptOptions {
  knowledgeContext?: string
}

const buildKnowledgeContextText = (options?: BuildPromptOptions, isPlanPrompt = false) =>
  options?.knowledgeContext
    ? [
        '如提供知识库上下文，请优先基于知识库回答；如果知识库没有覆盖，必须明确说明未在知识库中检索到直接依据。',
        isPlanPrompt ? '知识库只作为饮食和运动原则参考，最终仍必须严格返回指定 JSON 结构。' : '',
        options.knowledgeContext,
      ]
        .filter(Boolean)
        .join('\n')
    : ''

/**
 * 构建用于常规“聊天交互”场景下的完整对话上下文
 * AI在其中被赋予健康计划助手的身份，同时接收用户的身高体重数据、当前计划和历史记录背景
 * @param request 包含用户资料、计划、历史记录及聊天内容的请求对象
 * @returns 组装系统 prompt 及用户对话后生成的消息数组
 */
export const buildChatMessages = (
  request: AiChatRequest,
  options?: BuildPromptOptions,
): ChatCompletionMessage[] => [
  {
    content: [
      '你是 CaloriePilot 的健康计划助手。',
      '请基于用户资料、当前计划和最近历史，用中文给出简洁、可执行的建议。',
      '不要提供医疗诊断；遇到疾病、用药、严重不适时建议咨询专业医生。',
      buildKnowledgeContextText(options),
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
export const buildPlanMessages = (
  request: AiChatRequest,
  options?: BuildPromptOptions,
): ChatCompletionMessage[] => [
  {
    content: [
      '你是 CaloriePilot 的健身和饮食计划生成助手。',
      '请严格返回 JSON，不要包裹 Markdown 代码块。',
      '成功生成计划时，JSON 格式必须是：{"type":"plan_draft","plan":{"title":"1 天轻量减脂计划","goal":"轻量减脂","startDate":"YYYY-MM-DD","durationDays":1,"days":[{"dayIndex":1,"meals":[{"mealType":"breakfast","title":"燕麦鸡蛋餐","description":"燕麦 40g、鸡蛋 1 个。","calories":420},{"mealType":"lunch","title":"鸡胸肉米饭","description":"鸡胸肉 120g、米饭 150g。","calories":650},{"mealType":"dinner","title":"番茄豆腐汤","description":"番茄 150g、豆腐 120g。","calories":420}],"workouts":[{"title":"快走","description":"保持略微喘气的速度。","durationMinutes":30,"caloriesBurned":160}]}]}}。',
      '不能直接生成计划时，JSON 格式必须是：{"type":"needs_clarification","missingFields":["durationDays"],"reasons":["ambiguous_duration"],"message":"请告诉我计划天数，例如 7 天或 14 天。"}。',
      '计划草案禁止返回 content、summary、endDate、date、metadata、checkins、完成状态或保存状态。',
      '生成前必须明确计划天数、开始日期和目标方向；缺少任意一项时返回 needs_clarification。',
      '天数规则：一周等于 7 天，两周等于 14 天；一个月、半个月、长期、短期等表达需要追问；1 到 14 天可直接生成；15 到 30 天需要先提示用户确认；超过 30 天提示用户拆分生成。',
      '日期规则：可以解析明确自然语言日期，例如明天、下周一；周末、月底等模糊日期需要追问；开始日期不能早于今天；第 1 天就是开始日期。',
      '目标方向规则：不要从用户资料里猜目标，用户必须明确表达，例如减脂、增肌、控糖、提升体能；标题必须包含天数和目标方向。',
      '饮食规则：每天必须包含 breakfast、lunch、dinner 各一条，顺序固定为 breakfast、lunch、dinner；snack 可选且统一排在三餐后；只写食物名称、分量和总热量，不写制作教程。',
      '运动规则：workouts 是数组，可以为空；每个运动必须写具体做什么、做多久、预计消耗多少热量。',
      '如果 durationDays 大于 1，必须生成完整的 days 数组，days.length 必须等于 durationDays；不能只返回第 1 天，不能用省略号，不能用示例代替完整内容。',
      '数值和长度规则：durationDays 为 1 到 30 的整数；meal.calories 为 50 到 2000 的整数；workout.durationMinutes 为 1 到 300 的整数；workout.caloriesBurned 为 1 到 2000 的整数；title 不超过 40 字，goal 不超过 20 字，餐食和运动标题不超过 30 字，说明不超过 120 字。',
      '如果上下文包含 draftPlan，必须基于原草案和用户最新要求重新返回完整 AiGeneratedPlan，不要返回局部 patch；用户没要求修改的部分严格不动。',
      buildKnowledgeContextText(options, true),
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
export const buildPlanSummaryMessages = (
  request: AiChatRequest,
  options?: BuildPromptOptions,
): ChatCompletionMessage[] => [
  {
    content: [
      '你是 CaloriePilot 的健身和饮食计划生成助手。',
      '请先返回一段给用户看的计划摘要，用中文简短说明计划方向、饮食重点和运动重点。',
      '摘要只用于聊天预览，不保存到详细计划。',
      '不要返回 JSON，不要包裹 Markdown 代码块，不要列出完整每日计划。',
      buildKnowledgeContextText(options),
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
