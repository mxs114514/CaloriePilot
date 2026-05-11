import { createPinia } from 'pinia'
import Vant from 'vant'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './styles/index.css'
import 'vant/lib/index.css'
import '@vant/touch-emulator';


const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Vant)

app.mount('#app')
