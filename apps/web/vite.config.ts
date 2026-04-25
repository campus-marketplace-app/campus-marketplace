import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    define: {
      // Map Node-style process.env refs in the bundled backend to their VITE_ equivalents.
      'process.env.REQUIRE_EDU_EMAIL': JSON.stringify(env.VITE_REQUIRE_EDU_EMAIL ?? 'false'),
    },
  }
})
