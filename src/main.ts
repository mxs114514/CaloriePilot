import { createPinia } from 'pinia'
import Vant, { showConfirmDialog } from 'vant'
import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import router from './router'
import { registerPwaUpdatePrompt } from './services/pwaUpdate'
import './styles/index.css'
import 'vant/lib/index.css'
import '@vant/touch-emulator'


const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vant)

app.mount('#app')

registerPwaUpdatePrompt({
  confirmUpdate: showConfirmDialog,
  registerSW,
})
