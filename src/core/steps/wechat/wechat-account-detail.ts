import { log, type StepImpl } from 'assistsx-js'
import { SELECTORS } from './wechat-selectors'
import { clickNode, isOnAccountList, isVisible } from './wechat-utils'
import type { WechatStepData } from './wechat-types'

class WechatAccountDetail {
  /** 前置：已点击目标账号；成功/失败都交回 step.data.finishUnfollowed */
  unfollow: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const target = data.targets[data.targetIndex] || ''
    const nodes = await step.async.getAllNodes()

    const title = nodes.find(
      (n) => n.viewId === SELECTORS.profileNameViewId && isVisible(n),
    )
    if (!title) {
      if (step.repeatCount >= 8) {
        await log.appendTimestampedEntry(`[unfollow] 未进入「${target}」详情页`)
        const finishMissing = data.finishMissing
        if (finishMissing) {
          return step.next(finishMissing, {
            data: { ...data, currentName: target, failedReason: 'detail-not-open' },
          })
        }
        return undefined
      }
      return step.repeat({ delayMs: 800, repeatCountMax: 10 })
    }

    const titleText = (title.text || '').trim()
    if (titleText !== target) {
      await log.appendTimestampedEntry(`[unfollow] 详情页不匹配：${titleText} != ${target}`)
      step.back()
      const finishMissing = data.finishMissing
      if (finishMissing) {
        return step.next(finishMissing, {
          data: { ...data, currentName: target, failedReason: 'wrong-account' },
        })
      }
      return undefined
    }

    // 菜单已展开时直接进入确认阶段
    if (nodes.some((n) => (n.text || '').trim() === SELECTORS.unfollowText)) {
      return step.next(this.confirmDialog, { data, delayMs: 400 })
    }

    const more = nodes.find(
      (n) => n.viewId === SELECTORS.moreInfoViewId || n.des === SELECTORS.moreInfoDes,
    )
    const clicked = await clickNode(more)
    if (!clicked) {
      if (step.repeatCount >= 5) {
        const finishMissing = data.finishMissing
        if (finishMissing) {
          return step.next(finishMissing, {
            data: { ...data, currentName: target, failedReason: 'more-not-clickable' },
          })
        }
        return undefined
      }
      return step.repeat({ delayMs: 900, repeatCountMax: 8 })
    }
    return step.next(this.confirmDialog, { data, delayMs: 800 })
  }

  /** 前置：菜单或确认弹窗；成功：完成取关（或 dry-run 取消）并返回列表 */
  confirmDialog: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const target = data.targets[data.targetIndex] || ''
    const nodes = await step.async.getAllNodes()
    const keep = nodes.find(
      (n) => (n.text || '').trim() === SELECTORS.keepFollowingText && isVisible(n),
    )
    const unfollows = nodes.filter(
      (n) => (n.text || '').trim() === SELECTORS.unfollowText && isVisible(n),
    )

    if (!keep) {
      // 仍在底部菜单：点菜单里的「不再关注」，等确认弹窗
      if (unfollows.length > 0) {
        const sheetItem = unfollows[unfollows.length - 1]
        const ok = await clickNode(sheetItem)
        if (!ok) return step.repeat({ delayMs: 800, repeatCountMax: 8 })
        return step.next(this.confirmDialog, { data, delayMs: 800 })
      }
      if (step.repeatCount >= 6) {
        const finishMissing = data.finishMissing
        if (finishMissing) {
          return step.next(finishMissing, {
            data: { ...data, currentName: target, failedReason: 'menu-not-open' },
          })
        }
        return undefined
      }
      return step.repeat({ delayMs: 700, repeatCountMax: 10 })
    }

    if (data.dryRun) {
      await clickNode(keep)
      await log.appendTimestampedEntry(`[unfollow] dry-run：跳过「${target}」`)
      await step.delay(600)
      return step.next(this.backToList, {
        data: { ...data, currentName: target, accountResult: 'skipped' },
      })
    }

    // 弹窗里两个按钮：仍然关注（左）/ 不再关注（右），取最右侧
    const dialogBtn = unfollows
      .slice()
      .sort((a, b) => (b.bounds?.centerX ?? 0) - (a.bounds?.centerX ?? 0))[0]
    if (!dialogBtn) {
      const finishMissing = data.finishMissing
      if (finishMissing) {
        return step.next(finishMissing, {
          data: { ...data, currentName: target, failedReason: 'confirm-not-found' },
        })
      }
      return undefined
    }
    const ok = await clickNode(dialogBtn)
    if (!ok) return step.repeat({ delayMs: 800, repeatCountMax: 6 })
    await log.appendTimestampedEntry(`[unfollow] 已确认取关「${target}」`)
    await step.delay(1200)
    return step.next(this.backToList, {
      data: { ...data, currentName: target, accountResult: 'success' },
    })
  }

  /** 回到公众号列表，交回编排层 */
  backToList: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    if (!isOnAccountList(await step.async.getAllNodes())) {
      step.back()
      await step.delay(900)
      if (!isOnAccountList(await step.async.getAllNodes())) {
        if (step.repeatCount >= 5) {
          const finish = data.finishUnfollowed
          return finish ? step.next(finish, { data }) : undefined
        }
        return step.repeat({ delayMs: 800, repeatCountMax: 8 })
      }
    }
    const finish = data.finishUnfollowed
    return finish ? step.next(finish, { data }) : undefined
  }
}

export const wechatAccountDetail = new WechatAccountDetail()
