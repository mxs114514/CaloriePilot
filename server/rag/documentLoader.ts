import { Document } from '@langchain/core/documents'
import { readdir, readFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { PDFParse } from 'pdf-parse'

interface PdfPageText {
  pageNumber: number
  text: string
}

interface CreateKnowledgeDocumentsOptions {
  filePath: string
  pages: PdfPageText[]
}

export const inferBookTitleFromFileName = (fileName: string) => {
  const name = basename(fileName, extname(fileName))

  return name
    .replace(/\s+\([^)]*(z-library|1lib|z-lib)[^)]*\)\s*$/i, '')
    .replace(/\s+\([^)]*\)\s*$/u, '')
    .trim()
}

export const cleanKnowledgeText = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line && !/^[-—–]?\s*\d+\s*[-—–]?$/.test(line))
    .join('\n')

export const createKnowledgeDocumentsFromPages = ({
  filePath,
  pages,
}: CreateKnowledgeDocumentsOptions) => {
  const bookTitle = inferBookTitleFromFileName(filePath)

  return pages.flatMap(({ pageNumber, text }) => {
    const pageContent = cleanKnowledgeText(text)

    if (!pageContent) {
      console.warn(`知识库 PDF 页面内容为空，已跳过：${filePath} 第 ${pageNumber} 页`)

      return []
    }

    return [
      new Document({
        metadata: {
          bookTitle,
          pageNumber,
          source: filePath,
        },
        pageContent,
      }),
    ]
  })
}

const loadPdfPages = async (filePath: string): Promise<PdfPageText[]> => {
  const buffer = await readFile(filePath)
  const parser = new PDFParse({ data: new Uint8Array(buffer) })

  try {
    const result = await parser.getText()

    return result.pages.map((page) => ({
      pageNumber: page.num,
      text: page.text,
    }))
  } finally {
    await parser.destroy()
  }
}

export const loadKnowledgeDocuments = async (
  knowledgeDir = resolve(process.cwd(), 'doc', 'knowledge'),
): Promise<Document[]> => {
  const entries = await readdir(knowledgeDir, { withFileTypes: true })
  const pdfFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
    .map((entry) => join(knowledgeDir, entry.name))

  const documents = await Promise.all(
    pdfFiles.map(async (filePath) =>
      createKnowledgeDocumentsFromPages({
        filePath,
        pages: await loadPdfPages(filePath),
      }),
    ),
  )

  return documents.flat()
}
