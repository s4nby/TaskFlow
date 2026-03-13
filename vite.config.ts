import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { join } from 'path'

const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf-8')
)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    base: './',
    define: {
      'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version),
      '__GEMINI_API_KEY__': JSON.stringify(env.VITE_GEMINI_API_KEY ?? ''),
      '__GROQ_API_KEY__': JSON.stringify(env.VITE_GROQ_API_KEY ?? ''),
    }
  }
})
