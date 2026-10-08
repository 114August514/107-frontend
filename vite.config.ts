import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { authRequestProxy } from './vite.auth-proxy'

// jsdom + Primer 模块很吃内存，worker 不宜无上限；CI（GitHub 4 vCPU runner）
// 上 4 个 jsdom worker 与主线程互相抢占，会放大单个用例的渲染与查询耗时，是 issue #101
// 三组用例超出 5s 预算的直接诱因。CI 上降到 2 个 worker；本地多大核工作站保持 4 个。
const isCI = Boolean(process.env.CI)

const authMode = process.env.WORKSPACE107_AUTH_MODE?.trim() || 'ustc'
const loginStack = authMode === 'ustc'
const backendOrigin = process.env.WORKSPACE107_BACKEND_ORIGIN ?? 'http://127.0.0.1:8000'
const frontendPort = Number(
  process.env.WORKSPACE107_DEV_FRONTEND_PORT ??
    new URL(process.env.WORKSPACE107_PUBLIC_ORIGIN ?? 'http://127.0.0.1:5174').port,
)

export default defineConfig({
  plugins: [react(), loginStack ? authRequestProxy() : null],
  ssr: {
    noExternal: ['@primer/react'],
  },
  server: {
    port: frontendPort || 5174,
    strictPort: true,
    // AUTH_MODE=dev: 直接把 /api 转到后端。ustc 由 vite.auth-proxy 做 auth_request。
    proxy: loginStack
      ? undefined
      : {
          '/api': {
            target: backendOrigin,
            changeOrigin: true,
          },
        },
  },
  test: {
    environment: 'node',
    maxWorkers: isCI ? 2 : 4,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    deps: {
      optimizer: {
        web: {
          // issue #101：隔离模式下每个 jsdom 测试文件都要重新求值重依赖。
          // 用 esbuild 预打包成少量 chunk，缩短 collect。
          // @primer/react 含 Node 无法直接加载的 CSS import，保持按文件求值。
          enabled: true,
          include: [
            'react',
            'react-dom',
            'react-dom/client',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
            'react-router-dom',
            'dayjs',
            'xlsx',
            'prism-react-renderer',
          ],
        },
      },
    },
  },
})
