import type { Node } from 'assistsx-js'
import { SELECTORS } from './wechat-selectors'

export function textOf(node: Node | null | undefined): string {
  return ((node?.text || node?.des || '') as string).trim()
}

export function isVisible(node: Node): boolean {
  const b = node.bounds
  return !!b && b.isInScreen()
}

export function findVisibleText(nodes: Node[], text: string): Node | undefined {
  return nodes.find((n) => textOf(n) === text && isVisible(n))
}

/** 仅在通讯录页面匹配入口，避免误点消息列表中同名会话。 */
export function findOfficialEntry(nodes: Node[]): Node | undefined {
  const contactsTitle = nodes.some((n) =>
    n.viewId === 'android:id/text1' && textOf(n) === '通讯录' && isVisible(n),
  )
  if (!contactsTitle) return undefined
  return nodes.find((n) =>
    SELECTORS.officialEntryViewIds.some((id) => id === n.viewId) &&
    SELECTORS.officialEntryTexts.some((text) => text === textOf(n)) &&
    isVisible(n),
  )
}

export function findListView(nodes: Node[]): Node | undefined {
  return (
    nodes.find((n) => n.viewId === SELECTORS.listViewId && n.isScrollable) ||
    nodes.find((n) => n.viewId === SELECTORS.listViewId)
  )
}

export function isOnAccountList(nodes: Node[]): boolean {
  return nodes.some((n) => n.viewId === SELECTORS.listViewId && isVisible(n))
}

/** 当前屏可见的公众号名称（按列表顺序） */
export function collectAccountNames(nodes: Node[]): string[] {
  const names: string[] = []
  for (const n of nodes) {
    if (n.viewId !== SELECTORS.accountNameViewId) continue
    if (!isVisible(n)) continue
    const t = (n.text || '').trim()
    if (t && !names.includes(t)) names.push(t)
  }
  return names
}

export function findAccountNode(nodes: Node[], name: string): Node | undefined {
  return nodes.find(
    (n) =>
      n.viewId === SELECTORS.accountNameViewId &&
      (n.text || '').trim() === name &&
      isVisible(n),
  )
}

/** 节点不可点时回退到最近的 clickable 父节点 */
export async function clickNode(node: Node | null | undefined): Promise<boolean> {
  if (!node) return false
  try {
    if (node.isClickable) return await node.async.click()
    const parent = await node.async.findFirstParentClickable()
    if (parent) return await parent.async.click()
    return await node.async.click()
  } catch {
    return false
  }
}

export function randomBetween(min: number, max: number): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return Math.floor(lo + Math.random() * (hi - lo))
}
