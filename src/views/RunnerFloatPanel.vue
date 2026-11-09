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
let disposeLog: (() => Promise<void>) | undefined
let unmounted = false

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
  void log.subscribe(LogStream.entireLogText, ({ text }) => {
    logText.value = text
  }).then(async (subscription) => {
    if (unmounted) await subscription.dispose()
    else disposeLog = subscription.dispose
  }).catch(async (error) => {
    console.error('日志订阅失败', error)
    try {
      logText.value = (await log.readAllText()) + '\n日志实时订阅失败，请查看控制台。'
    } catch {
      logText.value = '日志读取和实时订阅失败，请查看控制台。'
    }
  })
  void log.subscribe(LogStream.entireLogText, ({ text }) => {
    logText.value = text
  }).then(async (subscription) => {
    if (unmounted) await subscription.dispose()
    else disposeLog = subscription.dispose
  }).catch((error) => {
    console.error('日志订阅失败：', error)
  })
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
  unmounted = true
  if (disposeLog) void disposeLog()
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
  padding: 0 10px;
  font-family: system-ui, -apple-system, sans-serif;
  color: #fff;
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
  color: #e2e8f0;
}
.runner-status {
  flex: none;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  color: #bfdbfe;
  font-size: 0.7rem;
}
.runner-status--done {
  color: #bbf7d0;
}
.runner-status--stopped {
  color: #fecaca;
}
.runner-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.3rem;
  margin-top: 0.4rem;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.2rem 0;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.55);
}
.stat-num {
  font-size: 0.85rem;
  font-weight: 600;
}
.stat-label {
  font-size: 0.6rem;
  color: #e2e8f0;
}
.runner-current {
  margin: 0.55rem 0 0;
  font-size: 0.75rem;
  color: #e2e8f0;
  word-break: break-all;
}
.runner-log {
  flex: 1;
  min-height: 0;
  margin: 0.6rem 0 0;
  padding: 0;
  overflow-y: auto;
  border-radius: 8px;
  color: #fff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
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
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  border: 1px solid #fff;
  border-radius: 8px;
  background: transparent;
  color: #fff;
  cursor: pointer;
}
.btn:disabled {
  cursor: not-allowed;
}
.btn-danger {
  border-color: #ff4d4f;
  background: #ff4d4f;
  color: #fff;
}
</style>
