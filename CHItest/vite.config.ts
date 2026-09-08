import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Production is served at https://<host>/chitest/. Local `npm run dev` stays at /.
  base: command === 'build' ? '/chitest/' : '/',
  test: {
    include: ['app/**/*.test.ts'],
    environment: 'node',
  },
}))
