import { log, type StepImpl } from 'assistsx-js'
import { SELECTORS } from './wechat-selectors'
import { clickNode, findAccountNode, isOnAccountList, isVisible, textOf } from './wechat-utils'
import type { WechatStepData } from './wechat-types'

/** 公众号列表的长按菜单。 */
class WechatAccountDetail {
  unfollow: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const target = data.targets[data.targetIndex] || ''
    const nodes = await step.async.getAllNodes()
    const item = nodes.find((n) => (n.text || '').trim() === SELECTORS.unfollowText && isVisible(n))

    if (!item) {
      if (step.repeatCount < 6) return step.repeat({ delayMs: 700, repeatCountMax: 8 })
      // 无法确认菜单状态时停止，避免后续操作落到错误页面。
      return data.finishError
        ? step.next(data.finishError, { data: { ...data, stopReason: 'unfollow-menu-not-found' } })
        : undefined
    }

    if (data.dryRun) {
      step.back()
      await log.appendTimestampedEntry(`[unfollow] dry-run：已打开「${target}」的取关菜单`)
      return step.next(this.verifyList, {
        data: { ...data, currentName: target, accountResult: 'skipped' }, delayMs: 700,
      })
    }

    if (!await clickNode(item)) {
      if (step.repeatCount < 5) return step.repeat({ delayMs: 700, repeatCountMax: 8 })
      return data.finishError
        ? step.next(data.finishError, { data: { ...data, stopReason: 'unfollow-menu-click-failed' } })
        : undefined
    }
    return step.next(this.confirmUnfollow, { data: { ...data, currentName: target }, delayMs: 700 })
  }

  /** 确认弹窗必须包含当前目标，避免对错误账号执行取关。 */
  confirmUnfollow: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const nodes = await step.async.getAllNodes()
    const keep = nodes.find((n) => textOf(n) === SELECTORS.keepFollowingText && isVisible(n))
    const confirm = nodes.find((n) => textOf(n) === SELECTORS.unfollowText && isVisible(n))
    const message = nodes.find((n) => isVisible(n) && textOf(n).includes(SELECTORS.unfollowText) &&
      !!data.currentName && textOf(n).includes(data.currentName) && textOf(n) !== SELECTORS.unfollowText)

    if (keep && confirm) {
      if (!message) {
        await log.appendTimestampedEntry('[unfollow] 确认弹窗与目标账号不匹配')
        return data.finishError
          ? step.next(data.finishError, { data: { ...data, stopReason: 'unfollow-confirm-target-mismatch' } })
          : undefined
      }
      if (await clickNode(confirm)) {
        await log.appendTimestampedEntry(`[unfollow] 已确认取关「${data.currentName}」`)
        return step.next(this.verifyList, {
          data: { ...data, accountResult: 'success' }, delayMs: 1000,
        })
      }
    }
    if (step.repeatCount < 6) return step.repeat({ delayMs: 700, repeatCountMax: 8 })
    await log.appendTimestampedEntry('[unfollow] 未能确认取关弹窗')
    return data.finishError
      ? step.next(data.finishError, { data: { ...data, stopReason: 'unfollow-confirm-failed' } })
      : undefined
  }

  /** 仅在返回列表且目标从当前列表消失后计为成功。 */
  verifyList: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const nodes = await step.async.getAllNodes()
    const listVisible = isOnAccountList(nodes)
    const menuVisible = nodes.some((n) => (n.text || '').trim() === SELECTORS.unfollowText && isVisible(n))
    const targetVisible = !!(await findAccountNode(nodes, data.currentName))
    if (listVisible && !menuVisible && (data.accountResult === 'skipped' || !targetVisible)) {
      const finish = data.finishUnfollowed
      return finish ? step.next(finish, { data }) : undefined
    }
    if (step.repeatCount < 6) return step.repeat({ delayMs: 800, repeatCountMax: 8 })
    if (!listVisible || menuVisible) {
      return data.finishError
        ? step.next(data.finishError, { data: { ...data, stopReason: 'list-not-restored' } })
        : undefined
    }
    const finish = data.finishMissing
    return finish
      ? step.next(finish, { data: { ...data, failedReason: 'account-still-visible' } })
      : undefined
  }
}

export const wechatAccountDetail = new WechatAccountDetail()
