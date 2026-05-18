interface AiChatViewStateInput {
  hasDraftPlan: boolean
  isPlanMode: boolean
}

export const getAiChatComposerState = ({ hasDraftPlan, isPlanMode }: AiChatViewStateInput) => {
  const isPlanContext = isPlanMode || hasDraftPlan
  return {
    modeToggleIcon: isPlanContext ? 'chat-o' : 'todo-list-o',
    modeToggleText: isPlanContext ? '对话' : '计划',
    sendIcon: isPlanContext ? 'play-circle-o' : 'guide-o',
  }
}
