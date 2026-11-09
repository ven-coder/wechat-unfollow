import { log, type StepImpl } from 'assistsx-js'
import { LIST_FOOTER_PATTERN } from './wechat-selectors'
import {
  clickNode,
  collectAccountNames,
  findAccountNode,
  findListView,
  findOfficialEntry,
  isOnAccountList,
} from './wechat-utils'
import type { WechatStepData } from './wechat-types'
import { wechatAccountDetail } from './wechat-account-detail'

class WechatOfficialAccounts {
  /** 前置：通讯录页；成功：进入公众号列表并回到顶部 */
  openEntry: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    if (step.repeatCount === 0) await log.appendTimestampedEntry('[list] 查找公众号列表入口')
    const nodes = await step.async.getAllNodes()
    if (isOnAccountList(nodes)) {
      await log.appendTimestampedEntry('[list] 已进入公众号列表')
      return step.next(this.scrollToTop, { data })
    }
    const entry = findOfficialEntry(nodes)
    if (!entry) {
      if (step.repeatCount >= 8) {
        await log.appendTimestampedEntry('[list] 未找到公众号入口')
        const finishError = data.finishError
        if (finishError) {
          return step.next(finishError, { data: { ...data, stopReason: 'official-entry-not-found' } })
        }
        return undefined
      }
      return step.repeat({ delayMs: 900, repeatCountMax: 10 })
    }
    const clicked = await clickNode(entry)
    if (!clicked) {
      return step.repeat({ delayMs: 900, repeatCountMax: 10 })
    }
    await log.appendTimestampedEntry('[list] 已点击公众号入口')
    await step.delay(1200)
    return step.repeat({ delayMs: 700, repeatCountMax: 16 })
  }

  /** 前置：公众号列表；成功：滚到顶部后按 task 分发 */
  scrollToTop: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    await log.appendTimestampedEntry('[list] 正在回到列表顶部')
    for (let i = 0; i < 24; i++) {
      const nodes = await step.async.getAllNodes()
      const list = findListView(nodes)
      if (!list) break
      const first = collectAccountNames(nodes)[0] || ''
      const ok = await list.async.scrollBackward()
      if (!ok) break
      await step.delay(400)
      const afterFirst = collectAccountNames(await step.async.getAllNodes())[0] || ''
      if (i > 0 && afterFirst && afterFirst === first) break
    }
    await log.appendTimestampedEntry('[list] 已回到列表顶部')
    const nextImpl = data.task === 'scan' ? this.scan : this.findTarget
    return step.next(nextImpl, { data })
  }

  /** 扫描：逐屏收集公众号名称，底部统计出现即结束 */
  scan: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const names = Array.isArray(data.scanNames) ? data.scanNames.slice() : []
    const nodes = await step.async.getAllNodes()
    const footer = nodes.find((n) => LIST_FOOTER_PATTERN.test((n.text || '').trim()))

    let added = 0
    for (const name of collectAccountNames(nodes)) {
      if (!names.includes(name)) {
        names.push(name)
        added++
      }
    }
    const scanIdle = added === 0 ? (data.scanIdle ?? 0) + 1 : 0
    const rounds = (data.scanRounds ?? 0) + 1
    await log.appendTimestampedEntry(`[scan] 第 ${rounds} 轮，累计 ${names.length} 个`)

    const nextData: WechatStepData = { ...data, scanNames: names, scanRounds: rounds, scanIdle }

    if (footer || scanIdle >= 2 || rounds >= (data.maxScrolls ?? 80)) {
      const finishScan = data.finishScan
      if (finishScan) return step.next(finishScan, { data: nextData })
      return undefined
    }

    const list = findListView(nodes)
    if (!list) {
      const finishScan = data.finishScan
      if (finishScan) return step.next(finishScan, { data: nextData })
      return undefined
    }
    const ok = await list.async.scrollForward()
    if (!ok) {
      const finishScan = data.finishScan
      if (finishScan) return step.next(finishScan, { data: nextData })
      return undefined
    }
    return step.next(this.scan, { data: nextData, delayMs: 700 })
  }

  /** 在列表里按名称定位下一个目标；找不到就滚动，到底则交回编排层 */
  findTarget: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const target = data.targets[data.targetIndex]
    if (!target) {
      const finishError = data.finishError
      if (finishError) {
        return step.next(finishError, { data: { ...data, stopReason: 'no-target' } })
      }
      return undefined
    }

    const nodes = await step.async.getAllNodes()
    if (!isOnAccountList(nodes)) {
      const finishError = data.finishError
      if (finishError) {
        return step.next(finishError, { data: { ...data, stopReason: 'list-not-visible' } })
      }
      return undefined
    }

    const hit = findAccountNode(nodes, target)
    if (hit) {
      const clicked = await clickNode(hit)
      if (!clicked) {
        return step.repeat({ delayMs: 900, repeatCountMax: 8 })
      }
      await log.appendTimestampedEntry(`[unfollow] 打开「${target}」`)
      return step.next(wechatAccountDetail.unfollow, { data, delayMs: 700 })
    }

    const missing = data.finishMissing
    const scrolled = data.targetScrolls ?? 0
    const list = findListView(nodes)
    if (!list || scrolled >= (data.maxTargetScrolls ?? 12)) {
      if (missing) {
        return step.next(missing, { data: { ...data, failedReason: 'not-found' } })
      }
      return undefined
    }
    const ok = await list.async.scrollForward()
    if (!ok) {
      if (missing) {
        return step.next(missing, { data: { ...data, failedReason: 'not-found' } })
      }
      return undefined
    }
    return step.next(this.findTarget, {
      data: { ...data, targetScrolls: scrolled + 1 },
      delayMs: 600,
    })
  }
}

export const wechatOfficialAccounts = new WechatOfficialAccounts()
