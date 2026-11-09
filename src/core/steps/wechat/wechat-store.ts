import { mmkv } from 'assistsx-js'
import { WECHAT_APP_NAME, WECHAT_PACKAGE } from './wechat-selectors'
import {
  DEFAULT_CONFIG,
  type RunCheckpoint,
  type RunProgress,
  type ScanResult,
  type WechatConfig,
  type WechatStepData,
  type WechatTask,
} from './wechat-types'

const MMKV_ID = 'unfollow'

const KEYS = {
  scan: 'wu:scan:v1',
  run: 'wu:run:v1',
  progress: 'wu:progress:v1',
  config: 'wu:config:v1',
  selection: 'wu:selection:v1',
  unfollowed: 'wu:unfollowed:v1',
} as const

async function putJson(key: string, value: unknown): Promise<void> {
  await mmkv.putString(key, JSON.stringify(value), { mmkvId: MMKV_ID })
}

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await mmkv.getString(key, { mmkvId: MMKV_ID })
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function saveScan(result: ScanResult): Promise<void> {
  return putJson(KEYS.scan, result)
}

export function loadScan(): Promise<ScanResult | null> {
  return getJson<ScanResult>(KEYS.scan)
}

export function saveRun(checkpoint: RunCheckpoint): Promise<void> {
  return putJson(KEYS.run, checkpoint)
}

export function loadRun(): Promise<RunCheckpoint | null> {
  return getJson<RunCheckpoint>(KEYS.run)
}

export function saveProgress(progress: RunProgress): Promise<void> {
  return putJson(KEYS.progress, progress)
}

export function loadProgress(): Promise<RunProgress | null> {
  return getJson<RunProgress>(KEYS.progress)
}

export async function loadConfig(): Promise<WechatConfig> {
  const stored = await getJson<Partial<WechatConfig>>(KEYS.config)
  return { ...DEFAULT_CONFIG, ...(stored || {}) }
}

export async function saveConfig(config: Partial<WechatConfig>): Promise<void> {
  const current = await loadConfig()
  await putJson(KEYS.config, { ...current, ...config })
}

export function saveSelection(names: string[]): Promise<void> {
  return putJson(KEYS.selection, names)
}

export function loadSelection(): Promise<string[] | null> {
  return getJson<string[]>(KEYS.selection)
}

export async function loadUnfollowed(): Promise<string[]> {
  return (await getJson<string[]>(KEYS.unfollowed)) || []
}

export function saveUnfollowed(names: string[]): Promise<void> {
  return putJson(KEYS.unfollowed, names)
}

/** 组装一次运行的初始 step.data */
export function buildStepData(input: {
  task: WechatTask
  hostPackage: string
  config: WechatConfig
  targets?: string[]
}): WechatStepData {
  return {
    task: input.task,
    appName: WECHAT_APP_NAME,
    packageName: WECHAT_PACKAGE,
    hostPackage: input.hostPackage,
    scanNames: [],
    scanRounds: 0,
    scanIdle: 0,
    maxScrolls: input.config.maxScrolls,
    targets: input.targets || [],
    targetIndex: 0,
    targetScrolls: 0,
    maxTargetScrolls: input.config.maxTargetScrolls,
    doneNames: [],
    failed: {},
    failedReason: '',
    dryRun: input.config.dryRun,
    success: 0,
    skipped: 0,
    failedCount: 0,
    currentName: '',
    accountResult: '',
    minDelayMs: input.config.minDelayMs,
    maxDelayMs: input.config.maxDelayMs,
    failStreak: 0,
    maxFailStreak: input.config.maxFailStreak,
    stopReason: '',
    startedAt: 0,
  }
}
