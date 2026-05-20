import { OpenAIEmbeddings } from '@langchain/openai'
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector'
import type { PoolConfig } from 'pg'
import { loadServerEnv } from './env'

loadServerEnv()

let vectorStore: PGVectorStore | null = null

/**
 * 初始化并验证 PgVector 连接
 */
export const initRagStore = async () => {
  const PG_DATABASE_URL = process.env.PG_DATABASE_URL
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY

  if (!PG_DATABASE_URL || !OPENAI_API_KEY) {
    console.warn('⚠️ 未配置 PG_DATABASE_URL 或 API_KEY，RAG 功能将不可用。')
    return false
  }

  try {
    const config: PoolConfig = {
      connectionString: PG_DATABASE_URL,
    }
    
    // 如果环境变量里是AI_API_KEY，且没配OPENAI_API_KEY，补齐给 LangChain
    const embeddings = new OpenAIEmbeddings({ 
      apiKey: OPENAI_API_KEY, 
      configuration: {
        baseURL: process.env.AI_API_BASE_URL
      }
    })
    
    vectorStore = await PGVectorStore.initialize(embeddings, {
      postgresConnectionOptions: config,
      tableName: 'langchain_pg_embedding',
    })
    
    console.log('✅ RAG PgVector 知识库连接成功！')
    return true
  } catch (error) {
    console.error('❌ 初始化 RAG 知识库失败:', error)
    return false
  }
}

/**
 * 根据用户的提问从数据库中检索相关的知识片段
 * @param query 用户的提问
 * @param k 检索的返回片段数量
 * @returns 拼接好的上下文文本
 */
export const retrieveContext = async (query: string, k = 3): Promise<string> => {
  if (!vectorStore) return ''

  try {
    const results = await vectorStore.similaritySearch(query, k)
    if (results.length === 0) return ''
    return results.map(doc => doc.pageContent).join('\n\n')
  } catch (error) {
    console.error('检索 RAG 失败:', error)
    return ''
  }
}

export const getVectorStore = () => vectorStore
