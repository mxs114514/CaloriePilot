import { Document } from '@langchain/core/documents'
import { describe, expect, it, vi } from 'vitest'

import { importKnowledge } from './importKnowledge'

const makeDocument = (index: number) =>
  new Document({
    metadata: { chunkIndex: index },
    pageContent: `chunk-${index}`,
  })

describe('知识库导入脚本', () => {
  it('空文档时不写入向量库', async () => {
    const addDocuments = vi.fn()
    const createVectorStore = vi.fn().mockResolvedValue({ addDocuments })

    await importKnowledge({
      clearCollection: vi.fn(),
      createVectorStore,
      loadDocuments: vi.fn().mockResolvedValue([]),
      log: vi.fn(),
      splitDocuments: vi.fn(),
    })

    expect(createVectorStore).not.toHaveBeenCalled()
    expect(addDocuments).not.toHaveBeenCalled()
  })

  it('大量 chunks 按批次写入并打印导入数量', async () => {
    const chunks = Array.from({ length: 120 }, (_, index) => makeDocument(index))
    const addDocuments = vi.fn()
    const log = vi.fn()

    await importKnowledge({
      batchSize: 50,
      clearCollection: vi.fn(),
      createVectorStore: vi.fn().mockResolvedValue({ addDocuments }),
      loadDocuments: vi.fn().mockResolvedValue([makeDocument(0)]),
      log,
      splitDocuments: vi.fn().mockResolvedValue(chunks),
    })

    expect(addDocuments).toHaveBeenCalledTimes(3)
    expect(addDocuments.mock.calls.map(([batch]) => batch)).toEqual([
      chunks.slice(0, 50),
      chunks.slice(50, 100),
      chunks.slice(100, 120),
    ])
    expect(log).toHaveBeenCalledWith('知识库导入完成，共写入 120 个文本块。')
  })

  it('写入前清理当前 collection，避免重复导入', async () => {
    const clearCollection = vi.fn()

    await importKnowledge({
      clearCollection,
      createVectorStore: vi.fn().mockResolvedValue({ addDocuments: vi.fn() }),
      loadDocuments: vi.fn().mockResolvedValue([makeDocument(0)]),
      log: vi.fn(),
      splitDocuments: vi.fn().mockResolvedValue([makeDocument(0)]),
    })

    expect(clearCollection).toHaveBeenCalledOnce()
  })
})
