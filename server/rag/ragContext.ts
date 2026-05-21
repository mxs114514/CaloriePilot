import type { Document } from '@langchain/core/documents'

import { getRagRuntimeConfig } from '../aiConfig'
import { createKnowledgeVectorStore } from './vectorStore'

interface KnowledgeRetriever {
  invoke(question: string): Promise<Document[]>
}

interface GetKnowledgeContextOptions {
  createRetriever?: () => Promise<KnowledgeRetriever>
  warn?: (message: string, error: unknown) => void
}

const formatSource = (metadata: Record<string, unknown>) => {
  const bookTitle = typeof metadata.bookTitle === 'string' ? metadata.bookTitle : '未知来源'
  const pageNumber = metadata.pageNumber

  return `《${bookTitle}》${typeof pageNumber === 'number' ? ` 第 ${pageNumber} 页` : ''}`
}

const formatKnowledgeContext = (documents: Document[]) => {
  if (documents.length === 0) {
    return ''
  }

  return [
    '知识库检索结果：',
    ...documents.map((document, index) =>
      [
        `[${index + 1}] 来源：${formatSource(document.metadata)}`,
        `内容：${document.pageContent}`,
      ].join('\n'),
    ),
  ].join('\n')
}

export const createKnowledgeRetriever = async (): Promise<KnowledgeRetriever> => {
  const { k } = getRagRuntimeConfig()
  const vectorStore = await createKnowledgeVectorStore()

  return vectorStore.asRetriever({ k })
}

export const getKnowledgeContext = async (
  question: string,
  {
    createRetriever = createKnowledgeRetriever,
    warn = console.warn,
  }: GetKnowledgeContextOptions = {},
) => {
  try {
    const retriever = await createRetriever()
    const documents = await retriever.invoke(question)

    return formatKnowledgeContext(documents)
  } catch (error) {
    warn('RAG 知识库检索失败，已降级为普通 AI 回答。', error)

    return ''
  }
}
