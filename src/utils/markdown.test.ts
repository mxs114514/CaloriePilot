/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest'

import { renderMarkdown } from './markdown'

describe('Markdown 渲染工具', () => {
  it('将 AI 回复中的 Markdown 转换为 HTML', () => {
    const html = renderMarkdown('**重点**\n\n- 少油\n- 高蛋白')

    expect(html).toContain('<strong>重点</strong>')
    expect(html).toContain('<li>少油</li>')
    expect(html).toContain('<li>高蛋白</li>')
  })

  it('清理 AI 回复中的危险 HTML', () => {
    const html = renderMarkdown(
      '[入口](javascript:alert(1))\n\n<img src=x onerror=alert(1)><script>alert(1)</script>',
    )

    expect(html).not.toContain('<a href="javascript:')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script')
  })

  it('保留普通换行的聊天阅读体验', () => {
    const html = renderMarkdown('第一行\n第二行')

    expect(html).toContain('第一行<br>')
    expect(html).toContain('第二行')
  })
})
