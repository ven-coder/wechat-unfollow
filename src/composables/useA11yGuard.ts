/**
 * 无障碍服务守卫
 *
 * 浮窗与自动化操作都依赖无障碍服务，未开启时首次调用会弹引导弹窗。
 * 用法：
 * ```ts
 * if (!(await ensureA11yEnabled())) return
 * await float.open('/examples/log-panel')
 * ```
 */
import { a11y } from 'assistsx-js'
import { ref } from 'vue'

/** 引导弹窗是否可见 */
const guideVisible = ref(false)

/** 重新检测中 */
const checking = ref(false)

/** 弹窗内的提示文案（去开启 / 重新检测的结果） */
const hint = ref('')

/** 等待无障碍检测结果的调用方 */
let resolvers: Array<(ok: boolean) => void> = []

interface AssistsXHostWindow {
  assistsxA11y?: { call: (json: string) => string | null }
}

/** 当前是否运行在 AssistsX 宿主的 WebView 内（浏览器联调时没有该桥） */
function a11yBridge(): AssistsXHostWindow['assistsxA11y'] {
  if (typeof window === 'undefined') {
    return undefined
  }
  return (window as unknown as AssistsXHostWindow).assistsxA11y
}

/**
 * 查询无障碍服务是否已开启。
 * 非宿主环境（浏览器联调）或检测失败时返回 true，避免阻塞页面。
 */
export async function isA11yEnabled(timeout = 5): Promise<boolean> {
  if (!a11yBridge()) {
    return true
  }
  try {
    const result = await a11y.isA11yEnabled(timeout)
    return result?.enabled === true
  } catch (error) {
    console.warn('[a11y-guard] 检测无障碍服务失败：', error)
    return true
  }
}

function settle(ok: boolean): void {
  guideVisible.value = false
  checking.value = false
  hint.value = ''
  const pending = resolvers
  resolvers = []
  pending.forEach((resolve) => resolve(ok))
}

/**
 * 确保无障碍服务已开启。
 *
 * 已开启直接返回 true；未开启时弹出引导弹窗，用户开启并「重新检测」通过后返回 true，
 * 点「暂不」或直接关闭则返回 false（调用方据此取消后续操作）。
 */
export async function ensureA11yEnabled(timeout = 5): Promise<boolean> {
  if (await isA11yEnabled(timeout)) {
    return true
  }
  hint.value = ''
  guideVisible.value = true
  return new Promise<boolean>((resolve) => {
    resolvers.push(resolve)
  })
}

/** 跳转系统无障碍设置页 */
export async function openA11ySettings(): Promise<void> {
  try {
    await a11y.openAccessibilitySettings(5)
    hint.value = '已为你打开系统无障碍设置，开启本应用的服务后回到这里点「我已开启，重新检测」'
  } catch (error) {
    console.warn('[a11y-guard] 打开无障碍设置失败：', error)
    hint.value = '无法自动打开设置页，请手动进入：系统设置 → 无障碍 → 找到本应用的服务并开启'
  }
}

/** 重新检测无障碍服务 */
export async function recheckA11y(): Promise<void> {
  if (checking.value) {
    return
  }
  checking.value = true
  hint.value = ''
  const enabled = await isA11yEnabled()
  checking.value = false
  if (enabled) {
    settle(true)
    return
  }
  hint.value = '仍未检测到无障碍服务已开启，请确认已在「系统设置 → 无障碍」中打开本应用的服务'
}

/** 关闭弹窗（取消当前操作） */
export function dismissA11yGuide(): void {
  settle(false)
}

/** 供组件使用的响应式状态与操作 */
export function useA11yGuard() {
  return {
    guideVisible,
    checking,
    hint,
    ensureA11yEnabled,
    openA11ySettings,
    recheckA11y,
    dismissA11yGuide,
  }
}
