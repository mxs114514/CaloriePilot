import type { Document } from '@langchain/core/documents'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export const splitKnowledgeDocuments = async (documents: Document[]) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkOverlap: 300,
    chunkSize: 1500,
  })
  const chunks = await splitter.splitDocuments(documents)

  return chunks.map(
    (chunk, chunkIndex) =>
      ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          chunkIndex,
        },
      }) satisfies Document,
  )
}
