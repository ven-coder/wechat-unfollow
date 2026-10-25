<template>
  <div class="runner">
    <header class="runner-head">
      <div>
        <h2 class="runner-title">{{ title }}</h2>
        <p class="runner-sub">{{ subtitle }}</p>
      </div>
      <span class="runner-status" :class="statusClass">{{ statusText }}</span>
    </header>

    <section class="runner-stats">
      <div class="stat">
        <span class="stat-num">{{ progress?.total ?? 0 }}</span>
        <span class="stat-label">总数</span>
      </div>
      <div class="stat">
        <span class="stat-num">{{ progress?.success ?? 0 }}</span>
        <span class="stat-label">成功</span>
      </div>
      <div class="stat">
        <span class="stat-num">{{ progress?.skipped ?? 0 }}</span>
        <span class="stat-label">跳过</span>
      </div>
      <div class="stat">
        <span class="stat-num">{{ progress?.failed ?? 0 }}</span>
        <span class="stat-label">失败</span>
      </div>
    </section>

    <p v-if="progress?.current" class="runner-current">
      当前：{{ progress.current }}
    </p>

    <pre ref="logRef" class="runner-log" aria-live="polite">{{ logText }}</pre>

    <footer class="runner-actions">
      <button type="button" class="btn btn-danger" :disabled="stopped" @click="onStop">
        {{ stopped ? '已停止' : '停止' }}
      </button>
      <button type="button" class="btn" @click="onClose">关闭浮窗</button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import {
  AssistsXAsync,
  LogStream,
  Step,
  float,
  log,
  type LogUpdateEvent,
} from 'assistsx-js'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  buildStepData,
  loadConfig,
  loadProgress,
  loadRun,
} from '../core/steps/wechat/wechat-store'
import { wechatUnfollow } from '../core/steps/wechat/wechat-unfollow'
import type { RunProgress } from '../core/steps/wechat/wechat-types'

defineOptions({ name: 'RunnerFloatPanel' })

const route = useRoute()
const logText = ref('')
const logRef = ref<HTMLElement | null>(null)
const progress = ref<RunProgress | null>(null)
const stopped = ref(false)

const task = route.query.task === 'unfollow' ? 'unfollow' : 'scan'
const title = task === 'scan' ? '扫描公众号' : '批量取关'

const subtitle = computed(() => {
  if (progress.value?.message) return progress.value.message
  return task === 'scan' ? '正在打开微信并扫描列表…' : '正在逐个匹配并取关…'
})

const statusText = computed(() => {
  const s = progress.value?.status
  if (s === 'done') return '已完成'
  if (s === 'stopped') return '已中止'
  return '进行中'
})

const statusClass = computed(() => ({
  'runner-status--done': progress.value?.status === 'done',
  'runner-status--stopped': progress.value?.status === 'stopped',
}))

let pollTimer: number | undefined

function onLogUpdate(evt: LogUpdateEvent): void {
  const data = evt.data
  if (!data?.text) return
  if (data.stream === LogStream.entireLogText) {
    logText.value = data.text
  } else {
    logText.value += data.text + '\n'
  }
}

watch(logText, async () => {
  await nextTick()
  if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
})

function onStop(): void {
  stopped.value = true
  try {
    Step.stop()
  } catch (error) {
    void log.appendTimestampedEntry('停止失败：' + String(error))
  }
}

async function onClose(): Promise<void> {
  try {
    await float.close()
  } catch {
    // 浮窗可能已关闭
  }
}

onMounted(async () => {
  log.addLogUpdateListener(onLogUpdate)
  logText.value = await log.readAllText()
  progress.value = await loadProgress()
  pollTimer = window.setInterval(() => {
    void loadProgress().then((value) => {
      progress.value = value
    })
  }, 700)

  const hostPackage = await AssistsXAsync.getPackageName()
  const config = await loadConfig()
  const run = task === 'unfollow' ? await loadRun() : null
  const data = buildStepData({
    task,
    hostPackage,
    config,
    targets: run?.targets || [],
  })

  try {
    await Step.run(
      task === 'scan' ? wechatUnfollow.startScan : wechatUnfollow.startUnfollow,
      { data },
    )
  } catch (error) {
    console.error(error)
    await log.appendTimestampedEntry('执行失败：' + String(error))
  }
})

onUnmounted(() => {
  log.removeLogUpdateListener(onLogUpdate)
  if (pollTimer) window.clearInterval(pollTimer)
})
</script>

<style scoped>
.runner {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0.9rem 1rem 0.75rem;
  font-family: system-ui, -apple-system, sans-serif;
  color: #1f2328;
  background: #f7f8fa;
}
.runner-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.runner-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.runner-sub {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: #5b636b;
}
.runner-status {
  flex: none;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: #e7f0fb;
  color: #0b6bcb;
  font-size: 0.7rem;
}
.runner-status--done {
  background: #e6f6e9;
  color: #1a7f37;
}
.runner-status--stopped {
  background: #fdecec;
  color: #cf222e;
}
.runner-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-top: 0.7rem;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.4rem 0;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
}
.stat-num {
  font-size: 1.05rem;
  font-weight: 600;
}
.stat-label {
  font-size: 0.68rem;
  color: #6a737d;
}
.runner-current {
  margin: 0.55rem 0 0;
  font-size: 0.75rem;
  color: #3b4248;
  word-break: break-all;
}
.runner-log {
  flex: 1;
  min-height: 0;
  margin: 0.6rem 0 0;
  padding: 0.6rem 0.7rem;
  overflow-y: auto;
  border-radius: 8px;
  background: #11161c;
  color: #d6dee6;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
}
.runner-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.6rem;
}
.btn {
  flex: 1;
  padding: 0.55rem 0.8rem;
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
.btn-danger {
  border-color: #f0c4c4;
  background: #fdecec;
  color: #cf222e;
}
</style>
