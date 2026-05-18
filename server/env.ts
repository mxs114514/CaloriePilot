import { config } from 'dotenv'
import { resolve } from 'node:path'

export const loadServerEnv = () => {
  config({ path: resolve(process.cwd(), '.env') })
}
