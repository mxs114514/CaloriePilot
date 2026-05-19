# AI 计划 SavedAiPlan 改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 生成计划完全切换到新计划设计：AI 草案使用严格结构，保存后使用 `SavedAiPlan -> days -> meals/workouts` 层级模型，并停止把 AI 草案保存为 `PlanItem/PlanCheckin`。

**Architecture:** 共享类型先定义前后端契约，后端负责生成与严格校验 AI 草案，前端只展示和保存通过校验的草案。保存后计划独立存入 `savedAiPlans` 表，计划状态、条目完成状态、完成率统计都围绕 `SavedAiPlan` 服务实现；旧 `PlanItem/PlanCheckin` 路径不再参与 AI 计划保存。

**Tech Stack:** Vue 3、TypeScript、Vite、Vitest、Pinia、Dexie、Hono、Vant。

---

## 文件结构

- 修改：`shared/ai.ts`  
  定义新 AI 草案响应、澄清响应、草案模型、运行时校验。
- 修改：`shared/ai.test.ts`  
  覆盖新草案校验、澄清响应类型、非法结构拒绝。
- 修改：`shared/models.ts`  
  新增保存后计划模型，扩展计划状态为 `pending | active | archived | completed`。
- 修改：`src/types/index.ts`  
  统一导出新增共享类型。
- 修改：`server/prompts.ts`  
  将计划生成 prompt 改为新结构和新规则。
- 修改：`server/index.ts`  
  解析 `plan_draft` / `needs_clarification` 两类 AI JSON 响应。
- 修改：`server/index.test.ts`  
  覆盖新接口响应、澄清响应、非法 AI 草案错误。
- 修改：`src/db/index.ts`  
  新增 `savedAiPlans` 表和数据库版本。
- 修改：`src/db/index.test.ts`  
  验证数据库版本升级。
- 新建：`src/services/savedAiPlans.ts`  
  负责保存草案、归档旧计划、状态流转、编辑、完成切换、完成率统计。
- 新建：`src/services/savedAiPlans.test.ts`  
  TDD 覆盖保存、状态、编辑、完成率。
- 修改：`src/services/aiChat.ts`  
  支持新 AI 响应联合类型。
- 修改：`src/services/aiChat.test.ts`  
  更新新请求和响应契约测试。
- 修改：`src/pages/ai-chat/aiChatViewState.ts`  
  如有必要，调整草案展示状态逻辑。
- 修改：`src/pages/ai-chat/aiChatViewState.test.ts`  
  覆盖草案存在时的展示状态。
- 修改：`src/pages/ai-chat/AiChatPage.vue`  
  展示新草案字段，处理澄清响应，保存到 `SavedAiPlan`。
- 修改：`src/pages/plan/PlanPage.vue`  
  实现保存后计划展示、完成切换、编辑/新增/删除入口。
- 可修改：`src/stores/profile.ts`、`src/db/index.ts` 中 `getActivePlan` 相关命名  
  保留既有 `GoalPlan` 用于用户基础减重目标；新增保存后 AI 计划查询，不混用两个“计划”概念。
- 可删除或停止引用：`src/services/planItems.ts` 的 AI 保存入口  
  不删除旧文件，除非确认没有其他页面依赖；至少移除 `AiChatPage.vue` 对 `saveAiGeneratedPlanItems` 的调用。

---

### Task 1: 更新共享 AI 草案契约

**Files:**
- Modify: `shared/ai.ts`
- Modify: `shared/ai.test.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: 写失败测试，覆盖合法新草案**

在 `shared/ai.test.ts` 新增测试：

```ts
it('校验符合新计划设计的 AI 草案响应', () => {
  expect(
    isAiPlanDraftResponse({
      type: 'plan_draft',
      plan: {
        title: '7 天轻量减脂计划',
        goal: '轻量减脂',
        startDate: '2026-05-20',
        durationDays: 7,
        days: Array.from({ length: 7 }, (_, index) => ({
          dayIndex: index + 1,
          meals: [
            { mealType: 'breakfast', title: '燕麦鸡蛋餐', description: '燕麦 40g、鸡蛋 1 个。', calories: 420 },
            { mealType: 'lunch', title: '鸡胸肉米饭', description: '鸡胸肉 120g、米饭 150g。', calories: 650 },
            { mealType: 'dinner', title: '番茄豆腐汤', description: '番茄 150g、豆腐 120g。', calories: 420 },
          ],
          workouts: [
            { title: '快走', description: '保持略微喘气的速度。', durationMinutes: 30, caloriesBurned: 160 },
          ],
        })),
      },
    }),
  ).toBe(true)
})
```

- [ ] **Step 2: 写失败测试，拒绝旧结构字段**

```ts
it('拒绝旧版 content、summary、checkins 结构', () => {
  expect(
    isAiPlanDraftResponse({
      type: 'plan_draft',
      content: '已生成计划',
      plan: {
        title: '7 天轻量减脂计划',
        summary: '旧摘要',
        days: [{ dayIndex: 1, meals: [], workouts: [], checkins: [] }],
      },
    }),
  ).toBe(false)
})
```

- [ ] **Step 3: 写失败测试，覆盖澄清响应**

```ts
it('校验 needs_clarification 响应', () => {
  expect(
    isAiPlanNeedsClarificationResponse({
      type: 'needs_clarification',
      missingFields: ['durationDays', 'startDate', 'goal'],
      reasons: ['ambiguous_duration'],
      message: '请告诉我计划天数、开始日期和目标方向。',
    }),
  ).toBe(true)
})
```

- [ ] **Step 4: 运行测试确认失败**

Run: `pnpm vitest run shared/ai.test.ts`  
Expected: FAIL，提示 `isAiPlanDraftResponse` 或新类型不存在。

- [ ] **Step 5: 实现新类型和校验**

在 `shared/ai.ts` 中替换旧草案结构：

```ts
export type PlanClarificationField = 'durationDays' | 'startDate' | 'goal'

export type InvalidPlanRequestReason =
  | 'duration_exceeds_limit'
  | 'long_duration_confirmation_required'
  | 'start_date_before_today'
  | 'ambiguous_start_date'
  | 'ambiguous_duration'

export type AiMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface AiGeneratedMeal {
  mealType: AiMealType
  title: string
  description: string
  calories: number
}

export interface AiGeneratedWorkout {
  title: string
  description: string
  durationMinutes: number
  caloriesBurned: number
}

export interface AiGeneratedPlanDay {
  dayIndex: number
  meals: AiGeneratedMeal[]
  workouts: AiGeneratedWorkout[]
}

export interface AiGeneratedPlan {
  title: string
  goal: string
  startDate: DateString
  durationDays: number
  days: AiGeneratedPlanDay[]
}

export interface AiPlanDraftResponse {
  type: 'plan_draft'
  plan: AiGeneratedPlan
}

export interface AiPlanNeedsClarificationResponse {
  type: 'needs_clarification'
  missingFields: PlanClarificationField[]
  reasons: InvalidPlanRequestReason[]
  message: string
}

export type AiChatResponse =
  | { content: string; type: 'message' }
  | AiPlanDraftResponse
  | AiPlanNeedsClarificationResponse
```

实现 `isAiGeneratedPlan`、`isAiPlanDraftResponse`、`isAiPlanNeedsClarificationResponse`，规则必须覆盖：

- `title` 长度 `1 - 40`，且包含 `durationDays` 和 `goal`
- `goal` 长度 `1 - 20`
- `startDate` 为 `YYYY-MM-DD`
- `durationDays` 为整数，`1 <= durationDays <= 30`
- `days.length === durationDays`
- `dayIndex` 从 `1` 连续递增
- 每天前三餐为 `breakfast -> lunch -> dinner`
- `snack` 只能出现在三餐后
- `meal.calories` 为整数，范围 `50 - 2000`
- `workout.durationMinutes` 为整数，范围 `1 - 300`
- `workout.caloriesBurned` 为整数，范围 `1 - 2000`
- 标题和描述长度按 `doc/temp.md` 规则执行

- [ ] **Step 6: 更新导出**

在 `src/types/index.ts` 导出新增类型和校验函数，移除 `AiGeneratedCheckin` 导出。

- [ ] **Step 7: 运行测试确认通过**

Run: `pnpm vitest run shared/ai.test.ts`  
Expected: PASS。

- [ ] **Step 8: 提交**

```bash
git add shared/ai.ts shared/ai.test.ts src/types/index.ts
git commit -m "refactor: update ai plan draft contract"
```

---

### Task 2: 更新后端 AI 响应解析和 prompt

**Files:**
- Modify: `server/prompts.ts`
- Modify: `server/index.ts`
- Modify: `server/index.test.ts`

- [ ] **Step 1: 写失败测试，计划模式返回新草案**

在 `server/index.test.ts` 更新“计划模式解析完整计划草案”，期望响应不再包含 `content`：

```ts
await expect(response.json()).resolves.toEqual({
  type: 'plan_draft',
  plan: validAiGeneratedPlan,
})
```

- [ ] **Step 2: 写失败测试，计划模式返回澄清响应**

```ts
it('计划模式允许返回需要澄清响应', async () => {
  const app = createAiChatApp({
    completeChat: async () =>
      JSON.stringify({
        type: 'needs_clarification',
        missingFields: ['durationDays'],
        reasons: ['ambiguous_duration'],
        message: '请告诉我计划天数，例如 7 天或 14 天。',
      }),
  })

  const response = await app.request('/api/ai/chat', {
    body: JSON.stringify({ messages: [{ content: '帮我做个短期计划', role: 'user' }], mode: 'plan' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  await expect(response.json()).resolves.toEqual({
    type: 'needs_clarification',
    missingFields: ['durationDays'],
    reasons: ['ambiguous_duration'],
    message: '请告诉我计划天数，例如 7 天或 14 天。',
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm vitest run server/index.test.ts`  
Expected: FAIL，当前解析仍要求 `content`。

- [ ] **Step 4: 更新解析逻辑**

在 `server/index.ts` 中将 `parsePlanDraft` 改为 `parsePlanResponse`：

- JSON 解析失败时抛出 `AiClientError('AI 返回的计划格式无效，请重新生成。')`
- `isAiPlanDraftResponse(parsed)` 时直接返回 parsed
- `isAiPlanNeedsClarificationResponse(parsed)` 时直接返回 parsed
- 其他结构抛相同错误

计划模式接口返回：

```ts
const planResponse = parsePlanResponse(content)
return context.json(planResponse)
```

- [ ] **Step 5: 更新 prompt**

在 `server/prompts.ts` 中替换计划 JSON 指令：

- 成功时只返回 `{"type":"plan_draft","plan":{...}}`
- 无法生成时返回 `{"type":"needs_clarification","missingFields":[],"reasons":[],"message":"中文提示"}`
- 明确禁止返回 `content`、`summary`、`date`、`metadata`、`checkins`
- 写入天数、日期、目标方向、饮食、运动、修改草案规则
- 如果上下文包含 `draftPlan`，必须返回完整 `AiGeneratedPlan`，不返回 patch

- [ ] **Step 6: 更新计划摘要 prompt**

保留 `/api/ai/chat/stream` 摘要能力，但摘要只进入聊天预览，不保存进计划。确认 prompt 明确“不保存摘要到详细计划”。

- [ ] **Step 7: 运行测试确认通过**

Run: `pnpm vitest run server/index.test.ts`  
Expected: PASS。

- [ ] **Step 8: 提交**

```bash
git add server/prompts.ts server/index.ts server/index.test.ts
git commit -m "refactor: parse new ai plan responses"
```

---

### Task 3: 新增保存后计划模型和数据库表

**Files:**
- Modify: `shared/models.ts`
- Modify: `src/types/index.ts`
- Modify: `src/db/index.ts`
- Modify: `src/db/index.test.ts`

- [ ] **Step 1: 写失败测试，数据库版本应升级**

在 `src/db/index.test.ts` 将期望改为：

```ts
expect(db.verno).toBe(4)
```

- [ ] **Step 2: 写失败测试，类型可构造保存后计划**

可在 `src/services/savedAiPlans.test.ts` 的第一轮先引入类型，或在模型测试中新建一个类型级对象：

```ts
const plan: SavedAiPlan = {
  id: 'saved-plan-a',
  title: '7 天轻量减脂计划',
  goal: '轻量减脂',
  startDate: '2026-05-20',
  durationDays: 7,
  status: 'pending',
  days: [],
}
expect(plan.status).toBe('pending')
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm vitest run src/db/index.test.ts`  
Expected: FAIL，当前版本为 `3` 或类型不存在。

- [ ] **Step 4: 更新保存后模型**

在 `shared/models.ts` 中：

```ts
export type PlanStatus = 'pending' | 'active' | 'archived' | 'completed'
export type SavedPlanStatus = PlanStatus
export type SavedMealType = MealType

export interface SavedAiPlan {
  id: string
  title: string
  goal: string
  startDate: DateString
  durationDays: number
  status: SavedPlanStatus
  days: SavedPlanDay[]
}

export interface SavedPlanDay {
  dayIndex: number
  meals: SavedMeal[]
  workouts: SavedWorkout[]
}

export interface SavedMeal {
  id: string
  mealType: SavedMealType
  source: PlanItemSource
  title: string
  description: string
  calories: number
  isCompleted: boolean
  completedAt?: DateTimeString
}

export interface SavedWorkout {
  id: string
  source: PlanItemSource
  title: string
  description: string
  durationMinutes: number
  caloriesBurned: number
  isCompleted: boolean
  completedAt?: DateTimeString
}

export interface PlanCompletionStats {
  totalCount: number
  completedCount: number
  completionRate: number
}
```

- [ ] **Step 5: 更新数据库**

在 `src/db/index.ts` 中：

- 引入 `SavedAiPlan`
- 增加 `savedAiPlans!: Table<SavedAiPlan, string>`
- 新增 `version(4).stores({ ..., savedAiPlans: 'id, status, startDate' })`

不删除旧 `planItems/planCheckins` 表，避免破坏已有数据和当前未迁移功能。

- [ ] **Step 6: 更新导出**

在 `src/types/index.ts` 导出 `SavedAiPlan`、`SavedPlanDay`、`SavedMeal`、`SavedWorkout`、`SavedPlanStatus`、`PlanCompletionStats`。

- [ ] **Step 7: 运行测试确认通过**

Run: `pnpm vitest run src/db/index.test.ts`  
Expected: PASS。

- [ ] **Step 8: 提交**

```bash
git add shared/models.ts src/types/index.ts src/db/index.ts src/db/index.test.ts
git commit -m "feat: add saved ai plan model"
```

---

### Task 4: 实现 SavedAiPlan 服务

**Files:**
- Create: `src/services/savedAiPlans.ts`
- Create: `src/services/savedAiPlans.test.ts`

- [ ] **Step 1: 写失败测试，草案保存为 SavedAiPlan**

测试 `buildSavedAiPlanFromDraft(draft, runtime)`：

- 生成计划 `id`
- 复制 `title/goal/startDate/durationDays/days`
- 每个 meal/workout 增加 `id/source/isCompleted`
- `source` 为 `'ai'`
- `status` 根据 `startDate` 和 today 计算：今天开始为 `active`，未来开始为 `pending`

- [ ] **Step 2: 写失败测试，保存新计划时归档旧 active/pending**

Mock `db.savedAiPlans`：

- 已有 `active` 计划和 `completed` 计划
- 保存新计划后，旧 `active` 变成 `archived`
- `completed` 不变
- 新计划写入

- [ ] **Step 3: 写失败测试，完成率统计**

```ts
expect(calculatePlanCompletionStats(plan)).toEqual({
  totalCount: 4,
  completedCount: 1,
  completionRate: 0.25,
})
```

- [ ] **Step 4: 写失败测试，完成状态切换**

覆盖：

- meal 可完成和取消完成
- workout 可完成和取消完成
- 完成时写 `completedAt`
- 取消完成时清除 `completedAt`

- [ ] **Step 5: 写失败测试，编辑规则**

覆盖：

- 每天 `breakfast/lunch/dinner` 最多一条
- `snack` 可多条
- 用户新增饮食默认 `snack`
- 修改已完成条目保留完成状态
- 删除已完成条目允许直接删除

- [ ] **Step 6: 运行测试确认失败**

Run: `pnpm vitest run src/services/savedAiPlans.test.ts`  
Expected: FAIL，服务不存在。

- [ ] **Step 7: 实现服务**

在 `src/services/savedAiPlans.ts` 中提供：

```ts
export const buildSavedAiPlanFromDraft = (...)
export const saveAiPlanDraft = async (...)
export const getCurrentOrPendingSavedAiPlan = async (...)
export const refreshSavedPlanStatus = (...)
export const calculatePlanCompletionStats = (...)
export const toggleSavedMealCompletion = async (...)
export const toggleSavedWorkoutCompletion = async (...)
export const addSavedMeal = async (...)
export const updateSavedMeal = async (...)
export const deleteSavedMeal = async (...)
export const addSavedWorkout = async (...)
export const updateSavedWorkout = async (...)
export const deleteSavedWorkout = async (...)
```

实现细节：

- 单次最多一个 `active/pending`
- 保存新计划前归档所有 `active/pending`
- `completed` 只由日期决定，不按打卡率决定
- `archived` 不自动变成 `completed`
- 结束日期用 `startDate + durationDays - 1` 计算，不存 `endDate`
- 新计划开始日期早于今天时抛 `RangeError`

- [ ] **Step 8: 运行测试确认通过**

Run: `pnpm vitest run src/services/savedAiPlans.test.ts`  
Expected: PASS。

- [ ] **Step 9: 提交**

```bash
git add src/services/savedAiPlans.ts src/services/savedAiPlans.test.ts
git commit -m "feat: save ai drafts as saved plans"
```

---

### Task 5: 更新 AI 对话页保存和展示

**Files:**
- Modify: `src/services/aiChat.ts`
- Modify: `src/services/aiChat.test.ts`
- Modify: `src/pages/ai-chat/aiChatViewState.ts`
- Modify: `src/pages/ai-chat/aiChatViewState.test.ts`
- Modify: `src/pages/ai-chat/AiChatPage.vue`

- [ ] **Step 1: 写失败测试，AI 服务支持澄清响应**

在 `src/services/aiChat.test.ts` 中补充 fetch mock，返回：

```ts
{
  type: 'needs_clarification',
  missingFields: ['goal'],
  reasons: [],
  message: '请告诉我目标方向，例如减脂或增肌。',
}
```

期望 `sendAiChatRequest` 原样返回。

- [ ] **Step 2: 写失败测试，AI 服务支持新草案响应**

返回 `type: 'plan_draft'`，无 `content` 字段。期望 `sendAiChatRequest` 原样返回。

- [ ] **Step 3: 运行服务测试确认失败**

Run: `pnpm vitest run src/services/aiChat.test.ts`  
Expected: FAIL，现有测试和类型仍按旧响应。

- [ ] **Step 4: 更新 AI 服务类型使用**

`src/services/aiChat.ts` 主要保持请求逻辑，调整响应类型，不再假设计划响应存在 `content`。

- [ ] **Step 5: 更新 AI 对话页逻辑**

在 `AiChatPage.vue`：

- 移除 `saveAiGeneratedPlanItems` import
- 引入 `saveAiPlanDraft`
- `response.type === 'needs_clarification'` 时，将 `response.message` 作为 assistant 消息加入聊天记录
- `response.type === 'plan_draft'` 时，整体替换 `draftPlan`
- 弹窗标题展示 `draftPlan.title`
- 副信息展示 `goal/startDate/durationDays`
- 每日标题用 `第 N 天`，不再使用 `day.date`
- 饮食展示 `mealType`、`title`、`description`、`calories`
- 运动展示 `title`、`description`、`durationMinutes`、`caloriesBurned`
- 移除 `summary` 和 `checkins` 展示
- 保存时调用 `saveAiPlanDraft(draftPlan.value)`

- [ ] **Step 6: 运行相关测试**

Run: `pnpm vitest run src/services/aiChat.test.ts src/pages/ai-chat/aiChatViewState.test.ts`  
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add src/services/aiChat.ts src/services/aiChat.test.ts src/pages/ai-chat/aiChatViewState.ts src/pages/ai-chat/aiChatViewState.test.ts src/pages/ai-chat/AiChatPage.vue
git commit -m "refactor: save ai drafts as saved plans from chat"
```

---

### Task 6: 实现计划页 SavedAiPlan 展示和完成状态

**Files:**
- Modify: `src/pages/plan/PlanPage.vue`
- Modify: `src/services/savedAiPlans.ts`
- Modify: `src/services/savedAiPlans.test.ts`

- [ ] **Step 1: 补服务测试，查询当前/未来保存后计划**

覆盖：

- `active` 优先
- 没有 `active` 时返回 `pending`
- `archived/completed` 不作为当前计划展示

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/services/savedAiPlans.test.ts`  
Expected: FAIL，查询函数未实现或规则不完整。

- [ ] **Step 3: 完善服务查询函数**

实现 `getCurrentOrPendingSavedAiPlan`，按状态筛选并按 `startDate` 排序。

- [ ] **Step 4: 实现页面基础展示**

`PlanPage.vue` 展示：

- 无保存计划：空状态
- 有保存计划：标题、目标、开始日期、天数、状态
- 每天折叠面板
- 饮食列表，按新计划顺序展示
- 运动列表，按数组顺序展示
- 每项有完成切换
- 页面暂时不展示完成率，但服务已计算

- [ ] **Step 5: 实现编辑入口**

最小可用范围：

- 修改饮食标题、说明、热量
- 新增饮食默认 `snack`
- 删除饮食
- 修改运动标题、说明、时长、消耗
- 新增运动
- 删除运动

如 UI 工作量过大，先保证服务完整、页面至少支持完成切换和展示；编辑弹窗可作为后续小任务，但不能违反新计划数据结构。

- [ ] **Step 6: 手动检查页面类型构建**

Run: `pnpm type-check`  
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add src/pages/plan/PlanPage.vue src/services/savedAiPlans.ts src/services/savedAiPlans.test.ts
git commit -m "feat: show saved ai plans on plan page"
```

---

### Task 7: 停止旧 AI PlanItem 保存路径并清理测试

**Files:**
- Modify: `src/services/planItems.ts`
- Modify: `src/services/planItems.test.ts`
- Search/Modify: all references from `rg "saveAiGeneratedPlanItems|buildPlanItemsFromAiPlan|AiGeneratedCheckin|checkins|summary" src shared server`

- [ ] **Step 1: 搜索旧引用**

Run: `rg -n "saveAiGeneratedPlanItems|buildPlanItemsFromAiPlan|AiGeneratedCheckin|checkins|summary|metadata|day\\.date" src shared server`

Expected: 只剩历史兼容或非 AI 保存用途；AI 草案路径不能再依赖这些字段。

- [ ] **Step 2: 更新或移除旧测试**

`planItems.test.ts` 中涉及“AI 计划中的食谱、训练和习惯转换为 PlanItem”的测试应删除或改名为旧数据兼容测试。不能再把它作为 AI 保存主路径。

- [ ] **Step 3: 处理 `PlanItemType = 'habit'`**

如果没有其他页面依赖 `habit`，可以保留类型但不从 AI 生成。不要为了新计划删除历史数据表，避免 Dexie 迁移风险。

- [ ] **Step 4: 运行旧服务测试**

Run: `pnpm vitest run src/services/planItems.test.ts`  
Expected: PASS，且测试名称不再声称 AI 草案保存为 `PlanItem`。

- [ ] **Step 5: 提交**

```bash
git add src/services/planItems.ts src/services/planItems.test.ts
git commit -m "refactor: stop saving ai plans as plan items"
```

---

### Task 8: 全量验证

**Files:**
- No direct file changes unless verification finds issues.

- [ ] **Step 1: 运行新旧相关单测**

Run:

```bash
pnpm vitest run shared/ai.test.ts server/index.test.ts src/services/aiChat.test.ts src/services/savedAiPlans.test.ts src/db/index.test.ts src/services/planItems.test.ts
```

Expected: PASS。

- [ ] **Step 2: 运行全量测试**

Run: `pnpm test`  
Expected: PASS。

- [ ] **Step 3: 运行类型检查**

Run: `pnpm type-check`  
Expected: PASS。

- [ ] **Step 4: 运行构建**

Run: `pnpm build`  
Expected: PASS。

- [ ] **Step 5: 最终搜索旧契约残留**

Run:

```bash
rg -n "content.*plan|summary|checkins|saveAiGeneratedPlanItems|buildPlanItemsFromAiPlan|AiGeneratedCheckin" src shared server
```

Expected:

- 不存在 AI 草案保存为 `PlanItem` 的调用
- 不存在 AI 草案依赖 `summary/checkins/content` 的代码
- 若有 `content`，只能属于普通聊天消息或 SSE 摘要，不属于 `plan_draft`

- [ ] **Step 6: 提交验证修复**

如果全量验证触发小修复：

```bash
git add <changed-files>
git commit -m "test: align ai saved plan migration"
```

---

## 风险和边界

- `GoalPlan` 当前承担用户基础减重目标，不应直接替换成 `SavedAiPlan`。本计划保留 `GoalPlan`，新增保存后 AI 计划模型，避免影响记录页、历史页和个人资料页。
- 不删除 `planItems/planCheckins` 表，避免 Dexie 破坏既有本地数据；只是停止 AI 草案保存路径使用它们。
- `pending -> active`、`active -> completed` 需要在读取保存后计划时刷新，或者在应用启动时刷新。首版建议在 `getCurrentOrPendingSavedAiPlan` 中刷新，避免引入后台任务。
- AI 草案不持久化；刷新页面后丢失，这符合新计划。
- 计划页编辑不调用 AI；所有编辑走本地 `SavedAiPlan` 服务。
