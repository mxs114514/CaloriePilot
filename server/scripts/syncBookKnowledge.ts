import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { getVectorStore, initRagStore } from '../ragService'

async function syncBook(filePath: string, bookId: string) {
  console.log(\📖 开发同步书籍: \ | 路径: \\)
  
  const initialized = await initRagStore()
  if (!initialized) {
    console.error('❌ RAG 存储初始化失败，无法同步。')
    return
  }

  const store = getVectorStore()!

  console.log('正在解析 PDF 文件...')
  const loader = new PDFLoader(filePath)
  const docs = await loader.load()
  console.log(\✅ 成功读取内容，共 \ 页。\)

  console.log('正在进行文本切割...')
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  })
  
  const splitDocs = await textSplitter.splitDocuments(docs)
  
  // 注入 metadata，标记是哪本书
  splitDocs.forEach((d) => {
    d.metadata = { ...d.metadata, bookId }
  })
  
  console.log(\✅ 切割完成，共 \ 个片段。正在存入向量数据库...\)

  await store.addDocuments(splitDocs)
  
  console.log('🎉 同步完毕！')
  process.exit(0)
}

async function deleteBook(bookId: string) {
  console.log(\🗑 开发删除书籍: \\)
  
  const initialized = await initRagStore()
  if (!initialized) {
    console.error('❌ RAG 存储初始化失败，无法删除。')
    return
  }

  const store = getVectorStore()!
  // 利用 pgvector store 的内在 sql / 删除手段
  // 这里暂时只能用原始的 pg 客户端删除了，这部分我们可以简单用 pg 补充。但若只想借助 store：
  try {
    const { pool } = (store as any)
    await pool.query('DELETE FROM langchain_pg_embedding WHERE cmetadata->>''bookId'' = ', [bookId])
    console.log('🎉 删除完毕！')
  } catch(e) {
    console.error('❌ 删除失败: ', e)
  }
  process.exit(0)
}

const command = process.argv[2]
const filePath = process.argv[3]
const bookId = process.argv[4]

if (command === 'add') {
  if(!filePath || !bookId) {
    console.log('用法: npx tsx server/scripts/syncBookKnowledge.ts add <PDF路径> <bookId>')
    process.exit(1)
  }
  syncBook(filePath, bookId)
} else if (command === 'remove') {
  if(!filePath) {
    console.log('用法: npx tsx server/scripts/syncBookKnowledge.ts remove <bookId>')
    process.exit(1)
  }
  // 在 remove 情况下，参数位置向左移动
  deleteBook(filePath)
} else {
  console.log('用法: npx tsx server/scripts/syncBookKnowledge.ts <add|remove> ...')
  process.exit(1)
}
