import { AssistsX, type Node } from 'assistsx-js'
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

/** 使用页面位置区分顶部标题、底部导航和后台页面。 */
function screenPosition(node: Node, x1: number, y1: number, x2: number, y2: number): boolean {
  const screen = AssistsX.getScreenSize()
  const b = node.bounds
  return !!screen && !!b && isVisible(node) && b.centerX >= screen.width * x1 &&
    b.centerX <= screen.width * x2 && b.centerY >= screen.height * y1 && b.centerY <= screen.height * y2
}

export function findContactsTab(nodes: Node[]): Node | undefined {
  const inTabArea = (n: Node) => screenPosition(n, 0.15, 0.8, 0.6, 1)
  return nodes.find((n) => textOf(n) === SELECTORS.tabContactsText && inTabArea(n)) ||
    nodes.find((n) => n.viewId === SELECTORS.tabLabelViewId && textOf(n) === SELECTORS.tabContactsText && isVisible(n))
}

/** 同名会话可能仍在节点树中，必须同时确认通讯录标题和入口位置。 */
export function findOfficialEntry(nodes: Node[]): Node | undefined {
  const title = nodes.some((n) => textOf(n) === '通讯录' && screenPosition(n, 0.2, 0, 0.8, 0.15))
  if (!title) return undefined
  for (const text of SELECTORS.officialEntryTexts) {
    const entry = nodes.find((n) => textOf(n) === text && screenPosition(n, 0.1, 0.15, 0.85, 0.7))
    if (entry) return entry
  }
  return nodes.find((n) => SELECTORS.officialEntryViewIds.some((id) => id === n.viewId) &&
    isVisible(n) && SELECTORS.officialEntryTexts.some((text) => text === textOf(n)))
}

export function findListView(nodes: Node[]): Node | undefined {
  const screen = AssistsX.getScreenSize()
  // 公众号列表顶部的更多信息按钮用于区分其他页面的列表。
  const hasHeader = nodes.some((n) => textOf(n) === SELECTORS.moreInfoDes && screenPosition(n, 0.75, 0, 1, 0.2))
  if (!hasHeader || !screen) return undefined
  const lists = nodes.filter((n) => n.className === 'android.widget.ListView' &&
    isVisible(n) && n.bounds.width >= screen.width * 0.8)
  // 列表内容不足一屏时，微信不会将它标记为可滚动。
  const identified = lists.find((n) => n.viewId === SELECTORS.listViewId)
  if (identified) return identified
  const scrollable = lists.filter((n) => n.isScrollable)
  return scrollable.length === 1 ? scrollable[0] : undefined
}

export function isOnAccountList(nodes: Node[]): boolean {
  return !!findListView(nodes)
}

/** 只读取列表子树，避免把后台窗口的文字当成公众号。 */
export async function collectAccountNodes(nodes: Node[]): Promise<Node[]> {
  const list = findListView(nodes)
  if (!list) return []
  const candidates = await list.async.findByTags('android.widget.TextView')
  const b = list.bounds
  const positioned = candidates.filter((n) => {
    const r = n.bounds
    return !!r && isVisible(n) && !!textOf(n) && r.left >= b.left + b.width * 0.1 &&
      r.left <= b.left + b.width * 0.3 && r.centerY > b.top && r.centerY < b.bottom
  })
  return positioned.length ? positioned : candidates.filter((n) =>
    n.viewId === SELECTORS.accountNameViewId && isVisible(n) && !!textOf(n),
  )
}

export async function collectAccountNames(nodes: Node[]): Promise<string[]> {
  return [...new Set((await collectAccountNodes(nodes)).map(textOf))]
}

export async function findAccountNode(nodes: Node[], name: string): Promise<Node | undefined> {
  return (await collectAccountNodes(nodes)).find((n) => textOf(n) === name)
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
