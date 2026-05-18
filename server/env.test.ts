import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { loadServerEnv } from './env'

describe('后端环境变量加载', () => {
  const originalCwd = process.cwd()
  const originalBaseUrl = process.env.AI_API_BASE_URL
  let tempDir: string | undefined

  afterEach(() => {
    process.chdir(originalCwd)
    restoreEnv('AI_API_BASE_URL', originalBaseUrl)

    if (tempDir) {
      rmSync(tempDir, { force: true, recursive: true })
      tempDir = undefined
    }
  })

  it('从当前工作目录的 .env 文件加载 AI 配置', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'calorie-pilot-env-'))
    writeFileSync(join(tempDir, '.env'), 'AI_API_BASE_URL=https://example.test/v1\n', 'utf8')
    delete process.env.AI_API_BASE_URL
    process.chdir(tempDir)

    loadServerEnv()

    expect(process.env.AI_API_BASE_URL).toBe('https://example.test/v1')
  })
})

const restoreEnv = (name: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}
