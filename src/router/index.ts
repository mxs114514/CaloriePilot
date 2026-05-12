import type { RouteRecordRaw } from 'vue-router'

import { createRouter, createWebHistory } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/record',
  },
  {
    path: '/record',
    name: 'record',
    component: () => import('@/pages/record/RecordPage.vue'),
  },
  {
    path: '/plan',
    name: 'plan',
    component: () => import('@/pages/plan/PlanPage.vue'),
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/pages/history/HistoryPage.vue'),
  },
  {
    path: '/ai-chat',
    name: 'ai-chat',
    component: () => import('@/pages/ai-chat/AiChatPage.vue'),
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/pages/profile/ProfilePage.vue'),
  },
  {
    path: '/profile/edit',
    name: 'profile-edit',
    component: () => import('@/pages/profile/ProfileEditPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
