import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'

/** 本地 assistsx-js 入口是否存在 */
export function assistsxLocalEntryExists(assistsxDevEntry) {
  try {
    return fs.existsSync(assistsxDevEntry) && fs.statSync(assistsxDevEntry).isFile()
  } catch {
    return false
  }
}

/**
 * 与 vite.config.js 共用：解析是否使用本地 assistsx-js 及入口路径。
 * 读取顺序：process.env → .env / .env.local（由 loadEnv 加载）。
 */
export function resolveAssistsxLocal({ envDir, mode = 'development' }) {
  const env = loadEnv(mode, envDir, '')
  const assistsxLocalOverride =
    process.env.ASSISTSX_JS_LOCAL ?? env.ASSISTSX_JS_LOCAL
  const assistsxLocalRoot = assistsxLocalOverride
    ? path.resolve(assistsxLocalOverride)
    : path.resolve(envDir, '../assistsx-js')
  const assistsxDevEntry = path.join(assistsxLocalRoot, 'src/index.ts')
  const useNpmOverride = process.env.ASSISTSX_USE_NPM ?? env.ASSISTSX_USE_NPM
  const preferLocalDev = mode === 'development' && useNpmOverride !== '1'
  const hasLocalSource = assistsxLocalEntryExists(assistsxDevEntry)
  /** 存在本地源码且未强制 npm 时，dev/build 均走本地 assistsx-js（含 v1 子路径） */
  const useLocalAssistsx = useNpmOverride !== '1' && hasLocalSource
  const localOk = useLocalAssistsx
  const preferLocal = preferLocalDev

  return {
    assistsxLocalRoot,
    assistsxDevEntry,
    useLocalAssistsx,
    preferLocal,
    localOk,
    hasLocalSource,
  }
}
