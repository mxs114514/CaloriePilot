import type { Document } from '@langchain/core/documents'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'

import { getRagRuntimeConfig } from '../aiConfig'
import { loadServerEnv } from '../env'
import { loadKnowledgeDocuments } from '../rag/documentLoader'
import { splitKnowledgeDocuments } from '../rag/textSplitter'
import { createKnowledgeVectorStore } from '../rag/vectorStore'

interface KnowledgeVectorStore {
  addDocuments(documents: Document[]): Promise<void>
}

interface ImportKnowledgeOptions {
  batchSize?: number
  clearCollection?: () => Promise<void> | void
  createVectorStore?: () => Promise<KnowledgeVectorStore>
  loadDocuments?: () => Promise<Document[]>
  log?: (message: string) => void
  splitDocuments?: (documents: Document[]) => Promise<Document[]>
}

const quoteIdentifier = (identifier: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`非法 PostgreSQL 标识符：${identifier}`)
  }

  return `"${identifier}"`
}

export const clearKnowledgeCollection = async () => {
  const { collectionName, connectionString, tableName } = getRagRuntimeConfig()
  const pool = new Pool({ connectionString })
  const chunksTable = quoteIdentifier(tableName)
  const collectionsTable = quoteIdentifier(`${tableName}_collections`)

  try {
    await pool.query(
      `DELETE FROM ${chunksTable}
       WHERE collection_id IN (
         SELECT uuid FROM ${collectionsTable} WHERE name = $1
       )`,
      [collectionName],
    )
  } finally {
    await pool.end()
  }
}

export const importKnowledge = async ({
  batchSize = 10,
  clearCollection = clearKnowledgeCollection,
  createVectorStore = createKnowledgeVectorStore,
  loadDocuments = loadKnowledgeDocuments,
  log = console.log,
  splitDocuments = splitKnowledgeDocuments,
}: ImportKnowledgeOptions = {}) => {
  const documents = await loadDocuments()

  if (documents.length === 0) {
    log('未找到可导入的知识库文档。')

    return
  }

  const chunks = await splitDocuments(documents)

  if (chunks.length === 0) {
    log('知识库文档切分后没有可导入内容。')

    return
  }

  const vectorStore = await createVectorStore()
  await clearCollection()

  for (let index = 0; index < chunks.length; index += batchSize) {
    await vectorStore.addDocuments(chunks.slice(index, index + batchSize))
  }

  log(`知识库导入完成，共写入 ${chunks.length} 个文本块。`)
}

const isCliEntry = () => process.argv[1] === fileURLToPath(import.meta.url)

if (isCliEntry()) {
  loadServerEnv()
  importKnowledge().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
