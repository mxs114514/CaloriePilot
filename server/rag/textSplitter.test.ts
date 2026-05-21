import { Document } from '@langchain/core/documents'
import { describe, expect, it } from 'vitest'

import { splitKnowledgeDocuments } from './textSplitter'

describe('知识库文本切分器', () => {
  it('切分长文本并保留 metadata，同时增加 chunkIndex', async () => {
    const sourceDocument = new Document({
      metadata: {
        bookTitle: '中国居民膳食指南（2022）',
        pageNumber: 12,
        source: 'doc/knowledge/book.pdf',
      },
      pageContent: Array.from({ length: 500 }, (_, index) => `第${index}段均衡膳食建议`).join('\n'),
    })

    const chunks = await splitKnowledgeDocuments([sourceDocument])

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0]?.metadata).toMatchObject({
      bookTitle: '中国居民膳食指南（2022）',
      chunkIndex: 0,
      pageNumber: 12,
      source: 'doc/knowledge/book.pdf',
    })
    expect(chunks[1]?.metadata).toMatchObject({
      chunkIndex: 1,
    })
  })
})
