<template>
  <main class="page">
    <header class="head">
      <h1 class="title">公众号批量取关</h1>
      <p class="sub">
        先扫描公众号列表，在下方勾选要取关的账号，再点「批量取关」。
      </p>
    </header>

    <section class="card">
      <div class="card-row">
        <div>
          <p class="label">扫描结果</p>
          <p class="value">{{ scan ? `${scan.total} 个公众号` : '尚未扫描' }}</p>
          <p v-if="scan" class="hint">上次扫描：{{ scanTime }}</p>
        </div>
        <button type="button" class="btn" @click="startScan">
          {{ scan ? '重新扫描' : '扫描公众号' }}
        </button>
      </div>
      <p v-if="progressText" class="progress" :class="{ 'progress--done': progress?.status === 'done' }">
        {{ progressText }}
      </p>
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

      <div class="footer">
        <label class="dry">
          <input v-model="dryRun" type="checkbox" />
          试运行（不真正取关）
        </label>
        <button
          type="button"
          class="btn btn--primary"
          :disabled="selected.length === 0 || busy"
          @click="startUnfollow"
        >
          批量取关（{{ selected.length }}）
        </button>
      </div>
    </section>

    <p class="warning">
      <strong>取关提醒：</strong>取关后可能难以找回，请谨慎选择并确认。误取关造成的后果由您自行承担。
    </p>
    <p class="tip">
      取关过程会停留在微信页面，结束后自动回到 AssistsX。
    </p>
  </main>
</template>

<script setup lang="ts">
import { float } from 'assistsx-js'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ensureA11yEnabled } from '../composables/useA11yGuard'
import {
  loadProgress,
  loadScan,
  loadSelection,
  loadUnfollowed,
  saveConfig,
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
  try {
    if (await float.containsByUniqueId(RUNNER_ID)) {
      await float.close(RUNNER_ID)
    }
  } catch {
    // 浮窗不存在时忽略
  }
  // 局域网插件的浮窗需要绝对地址；相对路径会被宿主当作本地插件资源
  const origin = window.location.origin
  const path = `/runner?task=${task}`
  const url = origin && origin.startsWith('http') ? `${origin}${path}` : path
  await float.open(url, {
    uniqueId: RUNNER_ID,
    showTopOperationArea: true,
    showBottomOperationArea: true,
    showBackground: false,
    keepScreenOn: false,
    initialWidth: 1000,
    initialHeight: 1500,
    center: true,
  })
}

async function startScan(): Promise<void> {
  if (!(await ensureA11yEnabled())) return
  await openRunner('scan')
}

async function startUnfollow(): Promise<void> {
  if (selected.value.length === 0) return
  if (!(await ensureA11yEnabled())) return
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
  await refresh()
  timer = window.setInterval(refresh, 1500)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<style scoped>
.page {
  box-sizing: border-box;
  min-height: 100%;
  padding: 1.1rem 1rem 2rem;
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
  max-height: 46vh;
  overflow-y: auto;
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
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  margin-top: 0.75rem;
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
