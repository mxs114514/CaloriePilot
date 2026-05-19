<script setup lang="ts">
import type { AiChatMessage, AiGeneratedPlan, AiRecentHistory } from '@/types'

import { storeToRefs } from 'pinia'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { computed, nextTick, onMounted, ref } from 'vue'

import {
  preloadAiRecentHistory,
  sendAiChatRequest,
  sendAiChatStreamRequest,
} from '@/services/aiChat'
import { saveAiGeneratedPlanItems } from '@/services/planItems'
import { useProfileStore } from '@/stores/profile'
import { renderMarkdown } from '@/utils/markdown'

import { getAiChatComposerState, getAiDraftPlanPresentationState } from './aiChatViewState'

interface UiChatMessage extends AiChatMessage {
  id: string
}

const profileStore = useProfileStore()
const { activePlan, profile } = storeToRefs(profileStore)

const messages = ref<UiChatMessage[]>([
  {
    content: '你好，我可以结合你的资料、目标和最近记录，帮你分析饮食运动，也可以生成可保存的计划。',
    id: 'welcome',
    role: 'assistant',
  },
])
const inputText = ref('')
const isSending = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const planModePending = ref(false)
const draftPlan = ref<AiGeneratedPlan | null>(null)
const draftContent = ref('')
const showDraftPlanPopup = ref(false)
const planBubbleOffset = ref(getDefaultPlanBubbleOffset())
const messageListRef = ref<HTMLElement>()
const activeDayNames = ref<number[]>([1])
const recentHistory = ref<AiRecentHistory>()
const recentHistoryPromise = ref<Promise<AiRecentHistory> | null>(null)

const canSend = computed(() => inputText.value.trim().length > 0 && !isSending.value)
const shouldShowPendingAssistant = computed(() => {
  const lastMessage = messages.value[messages.value.length - 1]

  return Boolean(isSending.value && lastMessage?.role === 'user')
})
const composerState = computed(() =>
  getAiChatComposerState({
    hasDraftPlan: Boolean(draftPlan.value),
    isPlanMode: planModePending.value,
  }),
)
const draftPlanPresentationState = computed(() =>
  getAiDraftPlanPresentationState({
    hasDraftPlan: Boolean(draftPlan.value),
  }),
)

const resetConversation = () => {
  messages.value = []
  inputText.value = ''
  errorMessage.value = ''
  draftPlan.value = null
  draftContent.value = ''
}

const getPreloadedRecentHistory = async () => {
  if (recentHistory.value) return recentHistory.value
  if (!recentHistoryPromise.value) return undefined

  try {
    return await recentHistoryPromise.value
  } catch {
    return undefined
  }
}

const toggleChatMode = async () => {
  if (isSending.value) return

  const targetModeName = planModePending.value || draftPlan.value ? '聊天' : '计划'

  try {
    await showConfirmDialog({
      message: `切换至${targetModeName}模式会清空当前聊天记录，是否切换?`,
      title: '切换模式',
    })
  } catch {
    return
  }

  resetConversation()
  planModePending.value = !planModePending.value
  await scrollToBottom()
}

const sendMessage = async () => {
  const content = inputText.value.trim()

  if (!content || isSending.value) return

  const userMessage: UiChatMessage = {
    content,
    id: crypto.randomUUID(),
    role: 'user',
  }
  const requestMode = planModePending.value || draftPlan.value ? 'plan' : 'chat'

  messages.value.push(userMessage)
  inputText.value = ''
  errorMessage.value = ''
  isSending.value = true
  await scrollToBottom()

  try {
    const requestRecentHistory = await getPreloadedRecentHistory()
    const requestInput = {
      activePlan: activePlan.value,
      draftPlan: draftPlan.value,
      messages: messages.value.map(({ content, role }) => ({ content, role })),
      mode: requestMode,
      profile: profile.value,
      recentHistory: requestRecentHistory,
    } as const

    if (requestMode === 'chat' || requestMode === 'plan') {
      const assistantMessageId = crypto.randomUUID()
      const assistantMessage: UiChatMessage = {
        content: '',
        id: assistantMessageId,
        role: 'assistant',
      }

      messages.value.push(assistantMessage)
      await sendAiChatStreamRequest(
        {
          ...requestInput,
          mode: requestMode,
        },
        {
          onDelta: delta => {
            appendAssistantDelta(assistantMessageId, delta)
            void scrollToBottom()
          },
        },
      )

      if (requestMode === 'chat') return
    }

    const response = await sendAiChatRequest(requestInput)

    if (response.type !== 'plan_draft') return

    draftContent.value = response.content
    draftPlan.value = response.plan
    showDraftPlanPopup.value = true
    messages.value.push({
      content: response.content,
      id: crypto.randomUUID(),
      role: 'assistant',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 请求失败，请稍后重试'
    errorMessage.value = message
    showFailToast(message)
  } finally {
    isSending.value = false
    await scrollToBottom()
  }
}

const appendAssistantDelta = (messageId: string, delta: string) => {
  const messageIndex = messages.value.findIndex(message => message.id === messageId)
  const message = messages.value[messageIndex]

  if (!message) return

  messages.value[messageIndex] = {
    ...message,
    content: `${message.content}${delta}`,
  }
}

const confirmSavePlan = async () => {
  if (!draftPlan.value) return

  if (!activePlan.value) {
    showFailToast('请先完成个人信息和目标设置')
    return
  }

  isSaving.value = true
  try {
    await saveAiGeneratedPlanItems(activePlan.value.id, draftPlan.value)
    showSuccessToast('计划已保存')
  } catch (error) {
    console.error('保存 AI 计划失败', error)
    showFailToast('保存失败，请稍后重试')
  } finally {
    isSaving.value = false
  }
}

const continueAdjusting = () => {
  planModePending.value = true
  inputText.value = ''
  showDraftPlanPopup.value = false
  messages.value.push({
    content: '请输入需要计划修改的地方',
    id: crypto.randomUUID(),
    role: 'assistant',
  })
  void scrollToBottom()
}

const scrollToBottom = async () => {
  await nextTick()
  const el = messageListRef.value
  if (!el) return

  el.scrollTop = el.scrollHeight
}

const openDraftPlanPopup = () => {
  showDraftPlanPopup.value = true
}

function getDefaultPlanBubbleOffset() {
  if (typeof window === 'undefined') {
    return { x: 320, y: 520 }
  }

  return {
    x: Math.max(16, window.innerWidth - 72),
    y: Math.max(96, window.innerHeight - 180),
  }
}

onMounted(async () => {
  if (!profileStore.isInitialized) {
    await profileStore.loadInitialData()
  }

  if (!activePlan.value) return

  try {
    recentHistoryPromise.value = preloadAiRecentHistory(activePlan.value)
    recentHistory.value = await recentHistoryPromise.value
  } catch (error) {
    console.error('预加载 AI 最近历史失败', error)
  } finally {
    recentHistoryPromise.value = null
  }
})
</script>

<template>
  <main class="page-shell ai-chat-page">
    <section ref="messageListRef" class="ai-chat-page__messages">
      <div
        v-for="message in messages"
        :key="message.id"
        class="ai-chat-page__message"
        :class="`is-${message.role}`"
      >
        <div class="message__avatar">
          <van-icon :name="message.role === 'assistant' ? 'smile-o' : 'contact'" />
        </div>
        <div class="message__content">
          <p v-if="message.role === 'assistant' && !message.content">
            <span class="typing-indicator">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </span>
          </p>
          <div
            v-else-if="message.role === 'assistant'"
            class="message__markdown"
            v-html="renderMarkdown(message.content)"
          ></div>
          <p v-else>{{ message.content }}</p>
        </div>
      </div>

      <!-- 等待回复期间的加载状态 -->
      <div
        v-if="shouldShowPendingAssistant"
        class="ai-chat-page__message is-assistant"
      >
        <div class="message__avatar">
          <van-icon name="smile-o" />
        </div>
        <div class="message__content">
          <p>
            <span class="typing-indicator">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </span>
          </p>
        </div>
      </div>

      <van-empty
        v-if="messages.length === 0"
        image="search"
        description="询问关于饮食、运动方面的问题，或者帮你生成一个计划吧！"
        style="margin: auto;"
      />

    </section>

    <p v-if="errorMessage" class="ai-chat-page__error">{{ errorMessage }}</p>

    <van-floating-bubble
      v-if="draftPlanPresentationState.shouldShowPlanBubble"
      v-model:offset="planBubbleOffset"
      axis="xy"
      icon="chat"
      magnetic="x"
      @click="openDraftPlanPopup"
    />

    <van-popup
      v-model:show="showDraftPlanPopup"
      class="ai-chat-page__draft-popup"
      closeable
      position="bottom"
      round
      safe-area-inset-bottom
    >
      <div v-if="draftPlan" class="draft-popup__content">
        <header class="draft-popup__header">
          <p class="draft-popup__eyebrow">AI 计划草案</p>
          <h2>{{ draftPlan.title }}</h2>
          <p>{{ draftPlan.summary }}</p>
        </header>

        <van-cell-group class="ai-chat-page__draft" inset>
          <van-cell title="计划天数" :value="`${draftPlan.days.length} 天`" />

          <van-collapse v-model="activeDayNames">
            <van-collapse-item
              v-for="day in draftPlan.days"
              :key="`${day.date ?? 'day'}-${day.dayIndex}`"
              :title="day.date ? `${day.date}` : `第 ${day.dayIndex} 天`"
              :name="day.dayIndex"
            >
              <div v-if="day.meals.length" class="plan-detail-section">
                <div class="plan-detail-title">饮食</div>
                <div v-for="(meal, index) in day.meals" :key="index" class="plan-detail-item">
                  <span class="item-title">{{ meal.title }}</span>
                  <span v-if="meal.description" class="item-desc">：{{ meal.description }}</span>
                </div>
              </div>
              <div v-if="day.workouts.length" class="plan-detail-section">
                <div class="plan-detail-title">运动</div>
                <div v-for="(workout, index) in day.workouts" :key="index" class="plan-detail-item">
                  <span class="item-title">{{ workout.title }}</span>
                  <span v-if="workout.description" class="item-desc">：{{ workout.description }}</span>
                </div>
              </div>
              <div v-if="day.checkins.length" class="plan-detail-section">
                <div class="plan-detail-title">习惯打卡</div>
                <div v-for="(checkin, index) in day.checkins" :key="index" class="plan-detail-item">
                  <span class="item-title">{{ checkin.title }}</span>
                  <span v-if="checkin.description" class="item-desc">：{{ checkin.description }}</span>
                </div>
              </div>
            </van-collapse-item>
          </van-collapse>
        </van-cell-group>

        <div class="ai-chat-page__draft-actions">
          <van-button round block plain type="primary" @click="continueAdjusting">
            继续调整
          </van-button>
          <van-button round block type="primary" :loading="isSaving" @click="confirmSavePlan">
            确认保存
          </van-button>
        </div>
      </div>
    </van-popup>

    <section class="ai-chat-page__composer">
      <van-button
        class="ai-chat-page__plan-button"
        round
        plain
        type="primary"
        :icon="composerState.modeToggleIcon"
        :disabled="isSending"
        @click="toggleChatMode"
      >
        {{ composerState.modeToggleText }}
      </van-button>
      <van-field
        v-model="inputText"
        autosize
        type="textarea"
        rows="1"
        class="ai-chat-page__input"
        @keydown.enter.exact.prevent="sendMessage"
      />
      <van-button
        class="ai-chat-page__send-button"
        round
        type="primary"
        icon="guide-o"
        :disabled="!canSend"
        :loading="isSending"
        aria-label="发送"
        @click="sendMessage"
      />
    </section>
  </main>
</template>

<style scoped>
.ai-chat-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* 底部留白 */
  padding: 0 0 calc(110px + env(safe-area-inset-bottom));
  background: #f7f8fa;
}

.ai-chat-page__messages {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 16px;
  padding: 16px 16px 24px;
  scroll-behavior: smooth;
}

.ai-chat-page__message {
  display: flex;
  gap: 10px;
}

.message__avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.message__content {
  display: flex;
  flex-direction: column;
  max-width: 75%;
}

.message__content p,
.message__markdown {
  padding: 12px 16px;
  margin: 0;
  border-radius: 18px;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-wrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.message__markdown :deep(p),
.message__markdown :deep(ul),
.message__markdown :deep(ol),
.message__markdown :deep(pre),
.message__markdown :deep(blockquote) {
  margin: 0 0 8px;
}

.message__markdown :deep(p:last-child),
.message__markdown :deep(ul:last-child),
.message__markdown :deep(ol:last-child),
.message__markdown :deep(pre:last-child),
.message__markdown :deep(blockquote:last-child) {
  margin-bottom: 0;
}

.message__markdown :deep(ul),
.message__markdown :deep(ol) {
  padding-left: 20px;
}

.message__markdown :deep(code) {
  padding: 2px 5px;
  font-size: 13px;
  background: #f2f3f5;
  border-radius: 4px;
}

.message__markdown :deep(pre) {
  padding: 10px 12px;
  overflow-x: auto;
  background: #f2f3f5;
  border-radius: 8px;
}

.message__markdown :deep(pre code) {
  padding: 0;
  background: transparent;
}

.message__markdown :deep(a) {
  color: #1989fa;
  word-break: break-all;
}

.ai-chat-page__message.is-assistant {
  flex-direction: row;
}

.is-assistant .message__avatar {
  background: #e6f7ff;
  color: #1989fa;
}

.is-assistant .message__content p,
.is-assistant .message__markdown {
  background: #fff;
  border-top-left-radius: 4px;
}

.ai-chat-page__message.is-user {
  flex-direction: row-reverse;
}

.is-user .message__avatar {
  background: #1989fa;
  color: #fff;
}

.is-user .message__content p {
  color: #fff;
  background: #1989fa;
  border-top-right-radius: 4px;
}

.ai-chat-page__draft {
  margin: 10px 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  border-radius: 16px;
}

.ai-chat-page__draft-popup {
  height: min(78vh, 720px);
  overflow: hidden;
}

.draft-popup__content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
  overflow-y: auto;
}

.draft-popup__header {
  padding: 8px 34px 4px 0;
}

.draft-popup__header h2 {
  margin: 0 0 8px;
  color: #1f2937;
  font-size: 20px;
  line-height: 1.25;
  letter-spacing: 0;
}

.draft-popup__header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.55;
}

.draft-popup__header .draft-popup__eyebrow {
  margin-bottom: 6px;
  color: #1989fa;
  font-size: 13px;
  font-weight: 600;
}

.ai-chat-page__draft-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px 16px 4px;
}

.ai-chat-page__plan-link {
  margin-bottom: 6px;
}

.plan-detail-section {
  margin-bottom: 12px;
}

.plan-detail-section:last-child {
  margin-bottom: 0;
}

.plan-detail-title {
  font-weight: bold;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.plan-detail-item {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
  padding-left: 12px;
  position: relative;
}

.plan-detail-item::before {
  content: '·';
  position: absolute;
  left: 0;
  color: #999;
}

.item-title {
  font-weight: 500;
  color: #1f2937;
}

.item-desc {
  color: #6b7280;
}

.ai-chat-page__error {
  padding: 0 16px 8px;
  color: #ef4444;
  font-size: 13px;
}

.ai-chat-page__composer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(64px + env(safe-area-inset-bottom));
  z-index: 100;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: end;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.85);
  border-top: 1px solid rgba(235, 237, 240, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.ai-chat-page__plan-button {
  min-width: 64px;
}

.ai-chat-page__send-button {
  width: 40px;
  height: 40px;
  padding: 0;
}

.ai-chat-page__input {
  padding: 8px 12px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #ebedf0;
  overflow: hidden;
}

/* AI 等待输入动画 */
.typing-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 40px;
  height: 20px;
}

.typing-indicator .dot {
  width: 6px;
  height: 6px;
  background-color: #9cb3c9;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator .dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-6px);
  }
}

@media (max-width: 374px) {
  .ai-chat-page__composer {
    grid-template-columns: 1fr auto;
  }

  .ai-chat-page__plan-button {
    grid-column: 1 / -1;
  }
}
</style>
