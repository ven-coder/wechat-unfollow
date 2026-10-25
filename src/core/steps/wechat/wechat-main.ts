import { log, type StepImpl } from 'assistsx-js'
import { SELECTORS, WECHAT_APP_NAME, WECHAT_PACKAGE } from './wechat-selectors'
import { clickNode, findVisibleText } from './wechat-utils'
import type { WechatStepData } from './wechat-types'
import { wechatOfficialAccounts } from './wechat-official-accounts'

class WechatMain {
  /** 前置：任意页面；成功：微信在前台并进入「通讯录」 */
  launch: StepImpl = async (step) => {
    const data = step.data as WechatStepData
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

  /** 前置：微信前台；成功：通讯录页出现公众号入口 */
  openContacts: StepImpl = async (step) => {
    const data = step.data as WechatStepData
    const nodes = await step.async.getAllNodes()
    if (findVisibleText(nodes, SELECTORS.officialEntryText)) {
      return step.next(wechatOfficialAccounts.openEntry, { data })
    }
    const tab = findVisibleText(nodes, SELECTORS.tabContactsText)
    if (!tab) {
      // 可能停在聊天详情等页面，退回一层
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
    await step.delay(900)
    return step.repeat({ delayMs: 600, repeatCountMax: 24 })
  }
}

export const wechatMain = new WechatMain()
