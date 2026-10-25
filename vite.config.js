import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolveAssistsxLocal } from './assistsx-resolve.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 与 vite.config.js 同目录，保证 `.env` / `.env.local` 定义在本项目根目录即可 */
const envDir = __dirname

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const {
    assistsxLocalRoot,
    assistsxDevEntry,
    useLocalAssistsx,
    preferLocal,
    localOk,
    hasLocalSource,
  } = resolveAssistsxLocal({ envDir, mode })

  if (preferLocal && !hasLocalSource) {
    console.info(
      `[vite] assistsx-js：未找到本地入口 ${assistsxDevEntry}，使用 node_modules`,
    )
  }
  if (useLocalAssistsx) {
    console.info(
      `[vite] assistsx-js：使用本地源码（根=${assistsxLocalRoot}，入口=${assistsxDevEntry}）`,
    )
  }

  return {
    envDir,
    plugins: [vue()],
    resolve: {
      alias: useLocalAssistsx
        ? [
            {
              find: 'assistsx-js/step-flow',
              replacement: path.join(assistsxLocalRoot, 'src/step-flow/index.ts'),
            },
            { find: 'assistsx-js', replacement: assistsxDevEntry },
          ]
        : [],
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      fs: {
        allow: [
          path.resolve(__dirname, '..'),
          ...(useLocalAssistsx ? [assistsxLocalRoot] : []),
        ],
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
    },
  }
})
