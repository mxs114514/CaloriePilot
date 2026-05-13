import { describe, expect, it, vi } from 'vitest'

import { registerPwaUpdatePrompt } from './pwaUpdate'

describe('PWA update prompt', () => {
  it('asks the user to refresh when a new version is available', async () => {
    const updateServiceWorker = vi.fn()
    const confirmUpdate = vi.fn().mockResolvedValue(undefined)
    const registerSW = vi.fn((options: { onNeedRefresh: () => void }) => {
      options.onNeedRefresh()
      return updateServiceWorker
    })

    registerPwaUpdatePrompt({ confirmUpdate, registerSW })
    await Promise.resolve()

    expect(confirmUpdate).toHaveBeenCalledWith({
      message: '发现新版本，是否立即刷新？',
      title: '应用已更新',
    })
    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('does not refresh when the user cancels the update prompt', async () => {
    const updateServiceWorker = vi.fn()
    const confirmUpdate = vi.fn().mockRejectedValue(new Error('cancelled'))
    const registerSW = vi.fn((options: { onNeedRefresh: () => void }) => {
      options.onNeedRefresh()
      return updateServiceWorker
    })

    registerPwaUpdatePrompt({ confirmUpdate, registerSW })
    await Promise.resolve()

    expect(updateServiceWorker).not.toHaveBeenCalled()
  })
})
