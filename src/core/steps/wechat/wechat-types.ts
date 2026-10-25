import type { StepImpl } from 'assistsx-js'

export type WechatTask = 'scan' | 'unfollow'
export type AccountResult = '' | 'success' | 'skipped' | 'failed'

export interface ScanResult {
  names: string[]
  total: number
  scannedAt: number
  complete: boolean
  hostPackage: string
}

export interface RunCheckpoint {
  version: number
  status: 'running' | 'done' | 'stopped'
  targets: string[]
  doneNames: string[]
  failed: Record<string, string>
  success: number
  skipped: number
  failedCount: number
  startedAt: number
  updatedAt: number
}

export interface RunProgress {
  task: WechatTask
  status: 'idle' | 'running' | 'done' | 'stopped'
  total: number
  current: string
  success: number
  skipped: number
  failed: number
  message: string
  updatedAt: number
}

export interface WechatConfig {
  dryRun: boolean
  maxScrolls: number
  maxTargetScrolls: number
  minDelayMs: number
  maxDelayMs: number
  longPauseEvery: number
  longPauseMinMs: number
  longPauseMaxMs: number
  maxFailStreak: number
}

export const DEFAULT_CONFIG: WechatConfig = {
  dryRun: false,
  maxScrolls: 80,
  maxTargetScrolls: 12,
  minDelayMs: 2500,
  maxDelayMs: 5000,
  longPauseEvery: 8,
  longPauseMinMs: 30000,
  longPauseMaxMs: 60000,
  maxFailStreak: 3,
}

/** 步骤间共享数据；finish* 为编排层注入的回调 */
export interface WechatStepData {
  task: WechatTask
  appName: string
  packageName: string
  hostPackage: string
  // 扫描
  scanNames: string[]
  scanRounds: number
  scanIdle: number
  maxScrolls: number
  // 取关
  targets: string[]
  targetIndex: number
  targetScrolls: number
  maxTargetScrolls: number
  doneNames: string[]
  failed: Record<string, string>
  failedReason: string
  dryRun: boolean
  success: number
  skipped: number
  failedCount: number
  currentName: string
  accountResult: AccountResult
  // 节奏与熔断
  minDelayMs: number
  maxDelayMs: number
  longPauseEvery: number
  longPauseMinMs: number
  longPauseMaxMs: number
  failStreak: number
  maxFailStreak: number
  stopReason: string
  startedAt: number
  // 编排回调
  finishScan?: StepImpl
  finishUnfollowed?: StepImpl
  finishMissing?: StepImpl
  finishError?: StepImpl
}
