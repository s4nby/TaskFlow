import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { join } from 'path'

const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf-8')
)

// Simple XOR-based obfuscation to match src/utils/crypto.ts
// (Duplicate logic here to avoid importing TS files into vite.config.ts)
const SECRET = 'taskflow-ai-architect-2026';
function encrypt(text: string): string {
  if (!text) return '';
  const result = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length);
    result.push(String.fromCharCode(charCode));
  }
  return Buffer.from(result.join('')).toString('base64');
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  const encGroq = encrypt(env.VITE_GROQ_API_KEY ?? '');

  return {
    plugins: [react()],
    base: './',
    define: {
      'import.meta.env.PACKAGE_VERSION': JSON.stringify(packageJson.version),
      '__GROQ_API_KEY__': JSON.stringify(encGroq),
    }
  }
})
