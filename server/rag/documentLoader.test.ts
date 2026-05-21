import { describe, expect, it } from 'vitest'

import {
  cleanKnowledgeText,
  createKnowledgeDocumentsFromPages,
  inferBookTitleFromFileName,
} from './documentLoader'

describe('知识库文档加载器', () => {
  it('从 PDF 文件名推断书名', () => {
    expect(
      inferBookTitleFromFileName(
        '中国居民膳食指南（2022） (中国营养学会) (z-library.sk, 1lib.sk, z-lib.sk).pdf',
      ),
    ).toBe('中国居民膳食指南（2022）')
  })

  it('清理空白和页码类噪音', () => {
    expect(cleanKnowledgeText('  第一章\r\n\r\n  均衡膳食  \n  - 12 - \n\n 每天运动  ')).toBe(
      '第一章\n均衡膳食\n每天运动',
    )
  })

  it('为每页文档补充来源、书名和页码元数据', () => {
    const documents = createKnowledgeDocumentsFromPages({
      filePath: 'D:/knowledge/中国居民膳食指南（2022）.pdf',
      pages: [
        { pageNumber: 1, text: '第一页内容' },
        { pageNumber: 2, text: '   ' },
      ],
    })

    expect(documents).toHaveLength(1)
    expect(documents[0]?.pageContent).toBe('第一页内容')
    expect(documents[0]?.metadata).toMatchObject({
      bookTitle: '中国居民膳食指南（2022）',
      pageNumber: 1,
      source: 'D:/knowledge/中国居民膳食指南（2022）.pdf',
    })
  })
})
