import { AssistsX, float, log, type Step, type StepImpl } from 'assistsx-js'
import { HOST_FALLBACK_PACKAGES } from './wechat-selectors'
import { wechatMain } from './wechat-main'
import { wechatOfficialAccounts } from './wechat-official-accounts'
import { loadUnfollowed, saveProgress, saveRun, saveScan, saveUnfollowed } from './wechat-store'
import { randomBetween } from './wechat-utils'
import type {
  RunCheckpoint,
  RunProgress,
  ScanResult,
  WechatStepData,
} from './wechat-types'

function checkpointOf(
  data: WechatStepData,
  status: RunCheckpoint['status'],
): RunCheckpoint {
  return {
    version: 1,
    status,
    targets: data.targets,
    doneNames: data.doneNames,
    failed: data.failed,
    success: data.success,
    skipped: data.skipped,
    failedCount: data.failedCount,
    startedAt: data.startedAt || Date.now(),
    updatedAt: Date.now(),
  }
}

async function pushProgress(
  data: WechatStepData,
  patch: Partial<RunProgress> = {},
): Promise<void> {
  await saveProgress({
    task: data.task,
    status: 'running',
    total: data.task === 'scan' ? data.scanNames.length : data.targets.length,
    current: data.targets[data.targetIndex] || '',
    success: data.success,
    skipped: data.skipped,
    failed: data.failedCount,
    message: '',
    updatedAt: Date.now(),
    ...patch,
  })
}

/** 结束后切回 AssistsX 并关闭浮窗 */
async function returnToHost(step: Step, data: WechatStepData): Promise<void> {
  let host = data.hostPackage
  if (!host) {
    for (const pkg of HOST_FALLBACK_PACKAGES) {
      try {
        if (AssistsX.isAppInstalled(pkg)) {
          host = pkg
          break
        }
      } catch {
        // 忽略桥接异常，继续尝试下一个
      }
    }
  }
  if (host) {
    await log.appendTimestampedEntry('[wechat] 返回 AssistsX')
    step.launchApp(host)
    await step.delay(1200)
  }
  try {
    await float.close()
  } catch {
    // 浮窗可能已被用户关闭
  }
}

class WechatUnfollow {
  /** 扫描任务入口 */
  startScan: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    data.finishScan = this.finishScan
    data.finishError = this.finishError
    data.startedAt = Date.now()
    await saveProgress({
      task: 'scan',
      status: 'running',
      total: 0,
      current: '',
      success: 0,
      skipped: 0,
      failed: 0,
      message: '正在扫描公众号列表…',
      updatedAt: Date.now(),
    })
    await log.appendTimestampedEntry('[scan] 开始扫描公众号列表')
    return step.next(wechatMain.launch, { data })
  }

  /** 取关任务入口 */
  startUnfollow: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    if (!data.targets.length) {
      await log.appendTimestampedEntry('[unfollow] 未选择任何公众号')
      return undefined
    }
    data.finishUnfollowed = this.afterAccount
    data.finishMissing = this.markMissing
    data.finishError = this.finishError
    data.startedAt = Date.now()
    await saveRun(checkpointOf(data, 'running'))
    await pushProgress(data, { message: '开始批量取关' })
    await log.appendTimestampedEntry(`[unfollow] 开始批量取关，共 ${data.targets.length} 个`)
    return step.next(wechatMain.launch, { data })
  }

  /** 单个账号处理完（成功 / dry-run 跳过 / 失败）后记账并决定下一步 */
  afterAccount: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const name = data.currentName
    const result = data.accountResult

    const doneNames = data.doneNames.slice()
    const failed = { ...data.failed }
    let success = data.success
    let skipped = data.skipped
    let failedCount = data.failedCount
    let failStreak = data.failStreak

    if (result === 'success') {
      success++
      failStreak = 0
      if (name && !doneNames.includes(name)) doneNames.push(name)
      if (name) {
        const unfollowed = await loadUnfollowed()
        if (!unfollowed.includes(name)) await saveUnfollowed([...unfollowed, name])
      }
      await log.appendTimestampedEntry(`[unfollow] 完成「${name}」`)
    } else if (result === 'skipped') {
      skipped++
      failStreak = 0
      if (name && !doneNames.includes(name)) doneNames.push(name)
    } else {
      failedCount++
      failStreak++
      if (name) failed[name] = data.failedReason || 'unknown'
      await log.appendTimestampedEntry(`[unfollow] 失败「${name}」：${failed[name] || 'unknown'}`)
    }

    const index = data.targetIndex + 1
    const nextData: WechatStepData = {
      ...data,
      targetIndex: index,
      targetScrolls: 0,
      currentName: '',
      accountResult: '',
      failedReason: '',
      success,
      skipped,
      failedCount,
      failStreak,
      doneNames,
      failed,
    }
    await saveRun(checkpointOf(nextData, 'running'))
    await pushProgress(nextData, {
      success,
      skipped,
      failed: failedCount,
    })

    if (failStreak >= data.maxFailStreak) {
      return step.next(this.finish, { data: { ...nextData, stopReason: 'too-many-failures' } })
    }
    if (index >= nextData.targets.length) {
      return step.next(this.finish, { data: nextData })
    }

    return step.next(wechatOfficialAccounts.findTarget, {
      data: nextData,
      delayMs: randomBetween(data.minDelayMs, data.maxDelayMs),
    })
  }

  /** 列表中找不到目标 */
  markMissing: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const name = data.targets[data.targetIndex] || ''
    return step.next(this.afterAccount, {
      data: { ...data, currentName: name, accountResult: 'failed' },
      delayMs: 400,
    })
  }

  finish: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const msg = `取关结束：成功 ${data.success}，跳过 ${data.skipped}，失败 ${data.failedCount}${
      data.stopReason ? `（${data.stopReason}）` : ''
    }`
    await log.appendTimestampedEntry(msg)
    await saveRun(checkpointOf(data, 'done'))
    await saveProgress({
      task: 'unfollow',
      status: 'done',
      total: data.targets.length,
      current: '',
      success: data.success,
      skipped: data.skipped,
      failed: data.failedCount,
      message: msg,
      updatedAt: Date.now(),
    })
    await returnToHost(step, data)
    return undefined
  }

  finishScan: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const names = data.scanNames.slice()
    const result: ScanResult = {
      names,
      total: names.length,
      scannedAt: Date.now(),
      complete: true,
      hostPackage: data.hostPackage,
    }
    await saveScan(result)
    await saveUnfollowed([])
    const msg = `扫描完成：共 ${names.length} 个公众号`
    await log.appendTimestampedEntry(msg)
    await saveProgress({
      task: 'scan',
      status: 'done',
      total: names.length,
      current: '',
      success: 0,
      skipped: 0,
      failed: 0,
      message: msg,
      updatedAt: Date.now(),
    })
    await returnToHost(step, data)
    return undefined
  }

  finishError: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const msg = `任务中止：${data.stopReason || 'unknown'}`
    await log.appendTimestampedEntry(msg)
    await saveProgress({
      task: data.task,
      status: 'stopped',
      total: data.task === 'scan' ? data.scanNames.length : data.targets.length,
      current: '',
      success: data.success,
      skipped: data.skipped,
      failed: data.failedCount,
      message: msg,
      updatedAt: Date.now(),
    })
    await returnToHost(step, data)
    return undefined
  }
}

export const wechatUnfollow = new WechatUnfollow()
