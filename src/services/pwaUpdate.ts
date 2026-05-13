type RegisterSW = (options: { onNeedRefresh: () => void }) => (reloadPage?: boolean) => Promise<void>

type ConfirmUpdate = (options: { message: string; title: string }) => Promise<unknown>

type RegisterPwaUpdatePromptOptions = {
  confirmUpdate: ConfirmUpdate
  registerSW: RegisterSW
}

export const registerPwaUpdatePrompt = ({
  confirmUpdate,
  registerSW,
}: RegisterPwaUpdatePromptOptions) => {
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      void confirmUpdate({
        message: '发现新版本，是否立即刷新？',
        title: '应用已更新',
      })
        .then(() => updateServiceWorker(true))
        .catch(() => undefined)
    },
  })
}
