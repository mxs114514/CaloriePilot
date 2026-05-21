import { Document } from '@langchain/core/documents'
import { describe, expect, it, vi } from 'vitest'

import { getKnowledgeContext } from './ragContext'

describe('RAG 上下文检索', () => {
  it('根据用户问题调用 retriever', async () => {
    const invoke = vi.fn().mockResolvedValue([])

    await getKnowledgeContext('成年人每天吃多少蔬菜？', {
      createRetriever: async () => ({ invoke }),
    })

    expect(invoke).toHaveBeenCalledWith('成年人每天吃多少蔬菜？')
  })

  it('无检索结果时返回空字符串', async () => {
    await expect(
      getKnowledgeContext('没有相关内容', {
        createRetriever: async () => ({ invoke: vi.fn().mockResolvedValue([]) }),
      }),
    ).resolves.toBe('')
  })

  it('有结果时格式化为中文知识库上下文', async () => {
    const context = await getKnowledgeContext('蔬菜水果建议', {
      createRetriever: async () => ({
        invoke: vi.fn().mockResolvedValue([
          new Document({
            metadata: {
              bookTitle: '中国居民膳食指南（2022）',
              pageNumber: 12,
            },
            pageContent: '成年人每天摄入蔬菜 300 到 500 克。',
          }),
        ]),
      }),
    })

    expect(context).toContain('知识库检索结果：')
    expect(context).toContain('[1] 来源：《中国居民膳食指南（2022）》 第 12 页')
    expect(context).toContain('内容：成年人每天摄入蔬菜 300 到 500 克。')
  })

  it('检索失败时返回空字符串并记录 warning', async () => {
    const warn = vi.fn()

    await expect(
      getKnowledgeContext('蔬菜水果建议', {
        createRetriever: async () => ({
          invoke: vi.fn().mockRejectedValue(new Error('database down')),
        }),
        warn,
      }),
    ).resolves.toBe('')
    expect(warn).toHaveBeenCalledWith('RAG 知识库检索失败，已降级为普通 AI 回答。', expect.any(Error))
  })
})
