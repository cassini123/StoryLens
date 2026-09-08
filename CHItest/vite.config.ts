import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const require = createRequire(import.meta.url)

function loadEnvFile(file: string): void {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eq = trimmed.indexOf('=')
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

function jimengDevPlugin(): Plugin {
  return {
    name: 'jimeng-dev-api',
    configureServer(server) {
      loadEnvFile(resolve(server.config.root, '../.env'))
      loadEnvFile(resolve(server.config.root, '.env'))
      const handler = require(resolve(server.config.root, '../api/jimeng.js'))
      server.middlewares.use('/api/jimeng', (req, res, next) => {
        Promise.resolve(handler(req, res)).catch(next)
      })
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), jimengDevPlugin()],
  base: command === 'build' ? '/chitest/' : '/',
  test: {
    include: ['app/**/*.test.ts'],
    environment: 'node',
  },
}))
