import { config } from 'dotenv'
import { resolve } from 'node:path'

/**
 * 加载服务端环境变量
 * 该函数使用 dotenv 加载项目根目录下的 .env 文件到 process.env 中，为后端 AI 等服务提供必要的配置。
 */
export const loadServerEnv = () => {
  config({ path: resolve(process.cwd(), '.env') })
}
