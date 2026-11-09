import { log, type StepImpl } from 'assistsx-js'
import { SELECTORS, WECHAT_APP_NAME, WECHAT_PACKAGE } from './wechat-selectors'
import { clickNode, findOfficialEntry, isOnAccountList } from './wechat-utils'
import type { WechatStepData } from './wechat-types'
import { wechatOfficialAccounts } from './wechat-official-accounts'

class WechatMain {
  /** 前置：任意页面；成功：微信在前台并进入「通讯录」 */
  launch: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    if (step.repeatCount === 0) await log.appendTimestampedEntry('[wechat] 检查微信前台状态')
    const current = await step.async.getPackageName()
    if (current !== WECHAT_PACKAGE) {
      await log.appendTimestampedEntry(`[wechat] 启动${WECHAT_APP_NAME}`)
      step.launchApp(WECHAT_PACKAGE)
      await step.delay(1600)
      const after = await step.async.getPackageName()
      if (after !== WECHAT_PACKAGE) {
        if (step.repeatCount >= 10) {
          await log.appendTimestampedEntry(`[wechat] ${WECHAT_APP_NAME}打开失败`)
          const finishError = data.finishError
          if (finishError) {
            return step.next(finishError, { data: { ...data, stopReason: 'wechat-not-foreground' } })
          }
          return undefined
        }
        return step.repeat({ delayMs: 1200, repeatCountMax: 12 })
      }
    }
    return step.next(this.openContacts, { data })
  }

  /** 返回微信主界面并点击通讯录。 */
  openContacts: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    if (step.repeatCount === 0) await log.appendTimestampedEntry('[wechat] 返回微信主界面')
    const nodes = await step.async.getAllNodes()
    const tab = nodes.find((n) => n.viewId === SELECTORS.tabLabelViewId && n.text === SELECTORS.tabContactsText && n.bounds?.isInScreen())
    if (!tab || isOnAccountList(nodes)) {
      if (step.repeatCount >= 18) {
        await log.appendTimestampedEntry('[wechat] 无法返回微信主界面')
        return data.finishError ? step.next(data.finishError, { data: { ...data, stopReason: 'wechat-home-not-found' } }) : undefined
      }
      step.back()
      return step.repeat({ delayMs: 900, repeatCountMax: 20 })
    }
    const clicked = await clickNode(tab)
    if (!clicked) {
      if (step.repeatCount >= 8) {
        const finishError = data.finishError
        if (finishError) {
          return step.next(finishError, { data: { ...data, stopReason: 'contacts-tab-not-clickable' } })
        }
        return undefined
      }
      return step.repeat({ delayMs: 900, repeatCountMax: 10 })
    }
    await log.appendTimestampedEntry('[wechat] 已点击通讯录')
    return step.next(this.verifyContacts, { data, delayMs: 900 })
  }

  /** 确认进入通讯录后再操作公众号入口。 */
  verifyContacts: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const nodes = await step.async.getAllNodes()
    if (findOfficialEntry(nodes)) {
      await log.appendTimestampedEntry('[wechat] 已进入通讯录')
      return step.next(wechatOfficialAccounts.openEntry, { data })
    }
    if (step.repeatCount >= 8) {
      await log.appendTimestampedEntry('[wechat] 无法确认通讯录页面')
      return data.finishError ? step.next(data.finishError, { data: { ...data, stopReason: 'contacts-not-confirmed' } }) : undefined
    }
    return step.repeat({ delayMs: 900, repeatCountMax: 10 })
  }
}

export const wechatMain = new WechatMain()
