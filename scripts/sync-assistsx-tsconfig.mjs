import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveAssistsxLocal } from '../assistsx-resolve.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envDir = path.resolve(__dirname, '..')
const outFile = path.join(envDir, '.tsconfig-assistsx.json')

const { useLocalAssistsx, assistsxDevEntry, assistsxLocalRoot, preferLocal, localOk } =
  resolveAssistsxLocal({ envDir })

// 类型只指向 dist 声明，避免 vue-tsc 把整个 assistsx-js 源码纳入检查
const assistsxTypesEntry = path.join(assistsxLocalRoot, 'dist/index.d.ts')
const assistsxStepFlowTypesEntry = path.join(assistsxLocalRoot, 'dist/step-flow/index.d.ts')
const typesEntry =
  useLocalAssistsx && fs.existsSync(assistsxTypesEntry)
    ? assistsxTypesEntry
    : useLocalAssistsx
      ? assistsxDevEntry
      : null
const stepFlowTypesEntry =
  useLocalAssistsx && fs.existsSync(assistsxStepFlowTypesEntry)
    ? assistsxStepFlowTypesEntry
    : null

const tsconfig =
  typesEntry != null
    ? {
        compilerOptions: {
          paths: {
            'assistsx-js': [typesEntry],
            ...(stepFlowTypesEntry ? { 'assistsx-js/step-flow': [stepFlowTypesEntry] } : {}),
          },
        },
      }
    : { compilerOptions: {} }

fs.writeFileSync(outFile, `${JSON.stringify(tsconfig, null, 2)}\n`)

if (preferLocal && !localOk) {
  console.info(
    `[assistsx-tsconfig] 未找到本地入口 ${assistsxDevEntry}，TypeScript 使用 node_modules`,
  )
} else if (useLocalAssistsx) {
  if (typesEntry === assistsxDevEntry) {
    console.warn(
      `[assistsx-tsconfig] 未找到 ${assistsxTypesEntry}，请在 assistsx-js 目录执行 npm run build`,
    )
  }
  console.info(`[assistsx-tsconfig] TypeScript paths：assistsx-js → ${typesEntry}`)
}
