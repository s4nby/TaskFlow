import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { join } from 'path'

const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf-8')
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version)
  }
})
