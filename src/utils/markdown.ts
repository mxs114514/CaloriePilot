import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
})

export const renderMarkdown = (content: string) => DOMPurify.sanitize(markdown.render(content))
