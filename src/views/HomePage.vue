<template>
  <main class="page">
    <header class="head">
      <h1 class="title">公众号批量取关</h1>
      <p class="sub">
        先扫描公众号列表，在下方勾选要取关的账号，再点「批量取关」。
      </p>
      <RouterLink class="log-link" :to="{ name: 'logs' }">查看日志</RouterLink>
    </header>

    <section class="card" aria-label="随选朗读状态">
      <div class="card-row">
        <div>
          <p class="label">Google 随选朗读服务</p>
          <p class="value">{{ selectToSpeakStatus === 'enabled' ? '已开启' : selectToSpeakStatus === 'disabled' ? '未检测到' : '无法检测' }}</p>
          <p class="hint">用于读取微信页面信息；厂商其他朗读服务可能无法识别。</p>
        </div>
        <button type="button" class="link" @click="refreshSelectToSpeak">刷新</button>
      </div>
      <p v-if="hideSelectToSpeakWarning" class="hint">任务前提醒已关闭 <button type="button" class="link" @click="restoreWarning">重新开启提醒</button></p>
    </section>

    <section class="card">
      <div class="card-row">
        <div>
          <p class="label">扫描结果</p>
          <p class="value">{{ scan ? `${scan.total} 个公众号` : '尚未扫描' }}</p>
          <p v-if="scan" class="hint">上次扫描：{{ scanTime }}</p>
        </div>
        <button type="button" class="btn" :disabled="busy || starting" @click="startTask('scan')">
          {{ scan ? '重新扫描' : '扫描公众号' }}
        </button>
      </div>
      <p v-if="progressText" class="progress" :class="{ 'progress--done': progress?.status === 'done' }">
        {{ progressText }}
      </p>
      <p v-if="taskError" class="warning" role="alert">{{ taskError }}</p>
    </section>

    <section v-if="scan" class="card card--list">
      <div class="toolbar">
        <input
          v-model="keyword"
          class="search"
          type="search"
          placeholder="搜索公众号"
          enterkeyhint="search"
        />
        <button type="button" class="link" @click="selectAll">全选</button>
        <button type="button" class="link" @click="clearAll">清空</button>
      </div>
      <p class="hint">已选 {{ selected.length }} / {{ scan.total }}</p>

      <ul class="list">
        <li
          v-for="name in filteredNames"
          :key="name"
          class="item"
          :class="{ 'item--done': unfollowed.includes(name) }"
          @click="toggle(name)"
        >
          <span v-if="!unfollowed.includes(name)" class="check" :class="{ 'check--on': selected.includes(name) }" />
          <span class="name">{{ name }}</span>
          <span v-if="unfollowed.includes(name)" class="success-label">取关成功</span>
        </li>
        <li v-if="filteredNames.length === 0" class="empty">没有匹配的公众号</li>
      </ul>

    </section>

    <div class="bottom-panel">
      <div v-if="scan" class="footer">
        <label class="dry">
          <input v-model="dryRun" type="checkbox" />
          试运行（不真正取关）
        </label>
        <button
          type="button"
          class="btn btn--primary"
          :disabled="selected.length === 0 || busy || starting"
          @click="startTask('unfollow')"
        >
          批量取关（{{ selected.length }}）
        </button>
      </div>
      <p v-if="scan && busy" class="hint">任务正在运行，请在浮窗中停止或等待完成后再启动。</p>
      <p class="warning">
        <strong>取关提醒：</strong>取关后可能难以找回，请谨慎选择并确认。误取关造成的后果由您自行承担。
      </p>
      <p class="tip">
        取关过程会停留在微信页面，结束后自动回到 AssistsX。
      </p>
    </div>
    <div v-if="pendingTask" class="dialog-mask" role="dialog" aria-modal="true" aria-labelledby="select-to-speak-title">
      <div class="dialog-card">
        <h2 id="select-to-speak-title">随选朗读提醒</h2>
        <p v-if="selectToSpeakStatus === 'disabled'">为正常读取微信页面信息，需先开启随选朗读服务。未开启将影响正常执行。</p>
        <p v-else-if="selectToSpeakStatus === 'enabled'">已检测到随选朗读服务开启，请确认是否继续执行。</p>
        <p v-else>无法确认随选朗读服务是否开启。为正常读取微信页面信息，请先检查随选朗读服务；未开启将影响正常执行。</p>
        <p v-if="settingsHint" class="hint">{{ settingsHint }}</p>
        <label class="dry"><input v-model="dontRemind" type="checkbox" />不再提醒</label>
        <div class="dialog-actions">
          <button type="button" class="btn" :disabled="dialogBusy" @click="openSelectToSpeakSettings">去开启</button>
          <button type="button" class="btn btn--primary" :disabled="dialogBusy" @click="continuePending">{{ selectToSpeakStatus === 'enabled' ? '确认继续' : '仍然执行' }}</button>
          <button type="button" class="btn" :disabled="dialogBusy" @click="cancelPending">取消</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { a11y, AssistsXAsync, float, log } from 'assistsx-js'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ensureA11yEnabled } from '../composables/useA11yGuard'
import {
  loadProgress,
  loadHideSelectToSpeakWarning,
  loadScan,
  loadSelection,
  loadUnfollowed,
  saveConfig,
  saveHideSelectToSpeakWarning,
  saveProgress,
  saveRun,
  saveSelection,
} from '../core/steps/wechat/wechat-store'
import type { RunProgress, ScanResult } from '../core/steps/wechat/wechat-types'

defineOptions({ name: 'HomePage' })

const RUNNER_ID = 'wechat-unfollow-runner'

const scan = ref<ScanResult | null>(null)
const selected = ref<string[]>([])
const unfollowed = ref<string[]>([])
const keyword = ref('')
const dryRun = ref(false)
const progress = ref<RunProgress | null>(null)
const selectToSpeakStatus = ref<'enabled' | 'disabled' | 'unknown'>('unknown')
const hideSelectToSpeakWarning = ref(false)
const starting = ref(false)
const pendingTask = ref<'scan' | 'unfollow' | null>(null)
const dontRemind = ref(false)
const dialogBusy = ref(false)
const settingsHint = ref('')
const taskError = ref('')
let statusRequest = 0
let preferencesReady: Promise<void> = Promise.resolve()

let timer: number | undefined

const filteredNames = computed(() => {
  const all = scan.value?.names || []
  const k = keyword.value.trim()
  return k ? all.filter((name) => name.includes(k)) : all
})

const scanTime = computed(() =>
  scan.value ? new Date(scan.value.scannedAt).toLocaleString() : '',
)

const busy = computed(() => progress.value?.status === 'running')

const progressText = computed(() => {
  const p = progress.value
  if (!p) return ''
  if (p.status === 'running') {
    const finished = p.success + p.skipped + p.failed
    const suffix = p.total ? `（${finished}/${p.total}）` : ''
    return `${p.message || '进行中'}${suffix}`
  }
  return p.message
})

async function refresh(): Promise<void> {
  scan.value = await loadScan()
  progress.value = await loadProgress()
  if (progress.value?.status === 'running') {
    try {
      if (!(await float.containsByUniqueId(RUNNER_ID))) {
        const latest = await loadProgress()
        if (latest?.status === 'running' && latest.updatedAt === progress.value.updatedAt) {
          progress.value = { ...latest, status: 'stopped', current: '', message: '上次任务已中断，可以重新开始', updatedAt: Date.now() }
          await saveProgress(progress.value)
        }
      }
    } catch {
      // 无法确认浮窗状态时保留运行状态，避免重复启动。
    }
  }
  unfollowed.value = await loadUnfollowed()
  const saved = await loadSelection()
  if (saved) {
    const names = scan.value?.names || []
    selected.value = saved.filter((name) => names.includes(name) && !unfollowed.value.includes(name))
  }
}

function toggle(name: string): void {
  if (unfollowed.value.includes(name)) return
  const index = selected.value.indexOf(name)
  if (index >= 0) selected.value.splice(index, 1)
  else selected.value.push(name)
  void saveSelection(selected.value)
}

function selectAll(): void {
  selected.value = filteredNames.value.filter((name) => !unfollowed.value.includes(name))
  void saveSelection(selected.value)
}

function clearAll(): void {
  selected.value = []
  void saveSelection(selected.value)
}

async function openRunner(task: 'scan' | 'unfollow'): Promise<void> {
  if (await float.containsByUniqueId(RUNNER_ID)) throw new Error('Runner already exists')
  if (!(await log.clear())) throw new Error('Failed to clear plugin log')
  // 局域网插件的浮窗需要绝对地址；相对路径会被宿主当作本地插件资源
  const origin = window.location.origin
  const path = `/runner?task=${task}`
  const url = origin && origin.startsWith('http') ? `${origin}${path}` : path
  let initialWidth = 1000
  let initialHeight = 1500
  try {
    const screen = await AssistsXAsync.getScreenSize()
    if (screen && screen.width > 0 && screen.height > 0) {
      initialWidth = Math.round(screen.width * 0.82)
      initialHeight = Math.round(screen.height * 0.48)
    }
  } catch {
    // 读取屏幕尺寸失败时沿用默认尺寸
  }
  await float.open(url, {
    uniqueId: RUNNER_ID,
    showTopOperationArea: true,
    showBottomOperationArea: true,
    keepScreenOn: false,
    initialWidth,
    initialHeight,
    center: true,
  })
}

async function refreshSelectToSpeak(): Promise<'enabled' | 'disabled' | 'unknown'> {
  const request = ++statusRequest
  let result: 'enabled' | 'disabled' | 'unknown' = 'unknown'
  try {
    const status = await a11y.getSelectToSpeakStatus(5)
    if (typeof status?.googleServiceEnabled === 'boolean') {
      result = status.googleServiceEnabled ? 'enabled' : 'disabled'
    }
  } catch {
    // 旧宿主、桥接不可用或检测失败时保持未知状态。
  }
  if (request === statusRequest) selectToSpeakStatus.value = result
  return result
}

async function restoreWarning(): Promise<void> {
  try {
    await saveHideSelectToSpeakWarning(false)
    hideSelectToSpeakWarning.value = false
  } catch (error) {
    console.error('Failed to restore Select to Speak warning', error)
  }
}

async function openSelectToSpeakSettings(): Promise<void> {
  dialogBusy.value = true
  settingsHint.value = ''
  try {
    let opened = false
    try {
      opened = (await a11y.openSystemSettings({
        action: 'android.settings.ACCESSIBILITY_DETAILS_SETTINGS',
        accessibilityServiceComponent: 'com.google.android.marvin.talkback/com.google.android.accessibility.selecttospeak.SelectToSpeakService',
      }, 5)).success
    } catch {
      // 旧宿主可能不支持通用设置页接口。
    }
    if (!opened) {
      try {
        opened = (await a11y.openSystemSettings({ action: 'android.settings.ACCESSIBILITY_SETTINGS' }, 5)).success
      } catch {
        try { opened = (await a11y.openAccessibilitySettings(5)).success } catch { /* 继续显示手动操作提示 */ }
      }
      if (opened) settingsHint.value = '已打开无障碍设置，请找到并开启随选朗读，返回后确认继续。'
    }
    if (!opened) settingsHint.value = '无法打开设置，请手动进入系统设置 → 无障碍 → 随选朗读。'
  } finally {
    dialogBusy.value = false
  }
}

function cancelPending(): void {
  pendingTask.value = null
  starting.value = false
}

async function continuePending(): Promise<void> {
  const task = pendingTask.value
  if (!task || dialogBusy.value) return
  dialogBusy.value = true
  try {
    if (dontRemind.value) {
      await saveHideSelectToSpeakWarning(true)
      hideSelectToSpeakWarning.value = true
    }
    pendingTask.value = null
    await executeTask(task)
  } catch (error) {
    if (pendingTask.value) {
      settingsHint.value = '无法保存提醒设置，请重试或取消勾选后继续。'
    } else {
      taskError.value = '无法启动任务，请确认没有正在运行的任务后重试。'
      console.error('Failed to start task', error)
    }
  } finally {
    dialogBusy.value = false
    if (!pendingTask.value) starting.value = false
  }
}

async function startTask(task: 'scan' | 'unfollow'): Promise<void> {
  if (starting.value || busy.value || (task === 'unfollow' && selected.value.length === 0)) return
  starting.value = true
  taskError.value = ''
  try {
    if (!(await ensureA11yEnabled())) return
    await preferencesReady
    const status = await refreshSelectToSpeak()
    if (status !== 'enabled' && !hideSelectToSpeakWarning.value) {
      dontRemind.value = false
      settingsHint.value = ''
      pendingTask.value = task
      return
    }
    await executeTask(task)
  } catch (error) {
    taskError.value = '无法启动任务，请确认没有正在运行的任务后重试。'
    console.error('Failed to start task', error)
  } finally {
    if (!pendingTask.value) starting.value = false
  }
}

async function executeTask(task: 'scan' | 'unfollow'): Promise<void> {
  if (await float.containsByUniqueId(RUNNER_ID)) throw new Error('Runner already exists')
  if (task === 'scan') {
    await openRunner('scan')
    return
  }
  if (selected.value.length === 0) return
  await saveConfig({ dryRun: dryRun.value })

  const order = scan.value?.names || []
  const targets = selected.value
    .slice()
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))

  await saveRun({
    version: 1,
    status: 'running',
    targets,
    doneNames: [],
    failed: {},
    success: 0,
    skipped: 0,
    failedCount: 0,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  })
  await openRunner('unfollow')
}

onMounted(async () => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', onFocus)
  void refreshSelectToSpeak()
  preferencesReady = loadHideSelectToSpeakWarning().then((value) => { hideSelectToSpeakWarning.value = value })
  await refresh()
  timer = window.setInterval(refresh, 1500)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('focus', onFocus)
  if (timer) window.clearInterval(timer)
})

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') void refreshSelectToSpeak()
}
function onFocus(): void {
  void refreshSelectToSpeak()
}
</script>

<style scoped>
.dialog-mask { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(0, 0, 0, 0.45); }
.dialog-card { width: min(100%, 26rem); box-sizing: border-box; padding: 1rem; border-radius: 12px; background: #fff; font-size: 0.875rem; line-height: 1.6; }
.dialog-card h2 { margin: 0; font-size: 1.05rem; }
.dialog-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
.log-link {
  display: inline-block;
  margin-top: 0.65rem;
  color: #2563eb;
  font-size: 0.875rem;
  text-decoration: none;
}
.page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 1.1rem 1rem 0;
  font-family: system-ui, -apple-system, sans-serif;
  color: #1f2328;
  background: #f7f8fa;
}
.head {
  margin-bottom: 0.9rem;
}
.title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}
.sub {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  line-height: 1.6;
  color: #5b636b;
}
.card {
  margin-bottom: 0.8rem;
  padding: 0.85rem 0.9rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}
.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}
.label {
  margin: 0;
  font-size: 0.72rem;
  color: #6a737d;
}
.value {
  margin: 0.2rem 0 0;
  font-size: 1.05rem;
  font-weight: 600;
}
.hint {
  margin: 0.3rem 0 0;
  font-size: 0.72rem;
  color: #6a737d;
}
.progress {
  margin: 0.7rem 0 0;
  padding-top: 0.6rem;
  border-top: 1px dashed #e5e7eb;
  font-size: 0.76rem;
  color: #0b6bcb;
}
.progress--done {
  color: #1a7f37;
}
.btn {
  padding: 0.55rem 0.9rem;
  font-size: 0.85rem;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  background: #fff;
  color: #1f2328;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn--primary {
  border-color: #0b6bcb;
  background: #0b6bcb;
  color: #fff;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.search {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.7rem;
  font-size: 0.82rem;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  background: #f8f9fa;
}
.link {
  flex: none;
  padding: 0.3rem 0;
  font-size: 0.78rem;
  border: none;
  background: none;
  color: #0b6bcb;
  cursor: pointer;
}
.list {
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid #eef0f2;
}
.item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.15rem;
  border-bottom: 1px solid #f0f2f4;
  cursor: pointer;
}
.item--done {
  cursor: default;
}
.check {
  flex: none;
  width: 1rem;
  height: 1rem;
  border: 1.5px solid #c4ccd4;
  border-radius: 4px;
  background: #fff;
  position: relative;
}
.check--on {
  border-color: #0b6bcb;
  background: #0b6bcb;
}
.check--on::after {
  content: '';
  position: absolute;
  left: 0.28rem;
  top: 0.08rem;
  width: 0.3rem;
  height: 0.55rem;
  border: solid #fff;
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}
.name {
  flex: 1;
  font-size: 0.85rem;
  word-break: break-all;
}
.success-label {
  flex: none;
  color: #1a7f37;
  font-size: 0.75rem;
}
.empty {
  padding: 1rem 0;
  text-align: center;
  font-size: 0.78rem;
  color: #8b949e;
}
.bottom-panel {
  position: sticky;
  bottom: 0;
  z-index: 10;
  margin: auto -1rem 0;
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid #e5e7eb;
  background: #f7f8fa;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}
.dry {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.76rem;
  color: #5b636b;
}
.tip {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  line-height: 1.6;
  color: #8b949e;
}
.warning {
  margin: 0.7rem 0 0;
  padding: 0.7rem 0.8rem;
  border: 1px solid #f0d59a;
  border-radius: 8px;
  background: #fff8e6;
  color: #79520c;
  font-size: 0.72rem;
  line-height: 1.6;
}
</style>
