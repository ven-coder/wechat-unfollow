<template>
  <div
    class="log-panel-page"
    :class="{ 'log-panel-page--floating': isFloatingLog }"
  >
    <pre ref="outputRef" class="log-panel-output" aria-live="polite">{{
      displayText
    }}</pre>
    <footer class="log-panel-actions">
      <button type="button" class="log-panel-btn" @click="onAddLog">
        添加日志
      </button>
      <button
        type="button"
        class="log-panel-btn"
        :disabled="clearing"
        @click="onClearLog"
      >
        {{ clearing ? '清空中…' : '清空日志' }}
      </button>
      <button
        type="button"
        class="log-panel-btn"
        :disabled="uploading"
        @click="onUploadClick"
      >
        {{ uploading ? '上传中…' : '上传日志' }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import {
  float,
  log,
  LogStream,
  type LogUpdateEvent,
  type LogUploadResult,
} from 'assistsx-js'
import {
  computed,
  nextTick,
  onActivated,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'
import { useRoute } from 'vue-router'
import { getLogUploadEnv } from '../config/log-upload-env'

defineOptions({ name: 'LogPanelPage' })

const logUploadEnv = getLogUploadEnv()

const route = useRoute()

/** 浮窗打开（无 inline=1）时为 true */
const isFloatingLog = computed(() => {
  const q = route.query.inline
  const isInline = q === '1' || (Array.isArray(q) && q[0] === '1')
  return !isInline
})

const lines = ref<string[]>([])
const demoSeq = ref(0)
const clearing = ref(false)
const uploading = ref(false)
const outputRef = ref<HTMLElement | null>(null)

const displayText = computed(() =>
  lines.value.length > 0 ? lines.value.join('\n') : '暂无日志内容。',
)

function scrollToBottom() {
  void nextTick(() => {
    const el = outputRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function onLogUpdate(ev: LogUpdateEvent) {
  if (ev.code !== 0 || !ev.data) return
  const { stream, text } = ev.data
  if (stream === LogStream.entireLogText) {
    lines.value = text ? text.split(/\r?\n/) : []
  } else {
    const line = text.trimEnd()
    if (line) lines.value = [...lines.value, line]
  }
  scrollToBottom()
}

async function loadLogFromBridge() {
  try {
    const text = (await log.readAllText()).trimEnd()
    if (text) lines.value = text.split(/\r?\n/)
  } catch {
    // 无 assistsxLog 桥接时忽略
  } finally {
    scrollToBottom()
  }
}

onMounted(() => {
  log.addLogUpdateListener(onLogUpdate)
  scrollToBottom()
  void loadLogFromBridge()
})

onActivated(() => {
  scrollToBottom()
})

onUnmounted(() => {
  log.removeLogUpdateListener(onLogUpdate)
})

function onAddLog() {
  demoSeq.value += 1
  const message = `示例日志 #${demoSeq.value}`
  log.appendTimestampedEntry(message)
}

async function onClearLog() {
  if (clearing.value) return
  clearing.value = true
  try {
    const ok = await log.clear()
    if (ok) {
      lines.value = []
      void float.toast('日志已清空', 1800).catch(() => {})
    } else {
      void float.toast('清空失败', 2200).catch(() => {})
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '清空失败'
    void float.toast(msg, 2200).catch(() => {})
  } finally {
    clearing.value = false
  }
}

function formatUploadFailureForLog(result: LogUploadResult): string {
  const parts: string[] = ['【上传失败】']
  parts.push(`消息：${result.message}`)
  if (result.httpCode !== undefined) {
    parts.push(`HTTP 状态码：${String(result.httpCode)}`)
  }
  if (result.causeMessage) {
    parts.push(`原因：${result.causeMessage}`)
  }
  if (result.responseBody) {
    parts.push(`响应正文：${result.responseBody}`)
  }
  if (result.localLogFilePath) {
    parts.push(`本地日志路径：${result.localLogFilePath}`)
  }
  if (result.localScreenshotFilePath) {
    parts.push(`本地截图路径：${result.localScreenshotFilePath}`)
  }
  if (result.localNodeTreeFilePath) {
    parts.push(`本地节点树路径：${result.localNodeTreeFilePath}`)
  }
  if (result.data !== undefined) {
    const s =
      typeof result.data === 'string'
        ? result.data
        : JSON.stringify(result.data, null, 2)
    parts.push(`数据：${s}`)
  }
  return parts.join('\n')
}

async function onUploadClick() {
  if (uploading.value) return
  uploading.value = true
  try {
    const result = await log.uploadLogs({
      timeout: 120,
      uploadKey: logUploadEnv.uploadKey,
      ...(logUploadEnv.logServiceBaseUrl
        ? { baseUrl: logUploadEnv.logServiceBaseUrl }
        : {}),
    })
    if (result.success) {
      let displayBaseUrl = logUploadEnv.logServiceBaseUrl
      if (!displayBaseUrl) {
        try {
          displayBaseUrl = (await log.getLogServiceBaseUrl()).trim()
        } catch {
          //
        }
      }
      const testAccountNote =
        '测试账号：test，密码：123321。测试日志保留 10 分钟，最多 10 条。'
      const line = displayBaseUrl
        ? `日志已上传。在 ${displayBaseUrl} 查看。\n${testAccountNote}`
        : `日志已上传。请在日志管理后台查看。\n${testAccountNote}`
      log.appendTimestampedEntry(line)
    } else {
      log.appendTimestampedEntry(formatUploadFailureForLog(result))
    }
  } catch (e) {
    const detail =
      e instanceof Error
        ? `${e.message}${e.stack ? `\n${e.stack}` : ''}`
        : String(e)
    log.appendTimestampedEntry(`【上传异常】\n${detail}`)
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.log-panel-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  background: transparent;
}

.log-panel-page:not(.log-panel-page--floating) .log-panel-output {
  color: #0f172a;
}

.log-panel-output {
  flex: 1 1 0;
  min-height: 0;
  margin: 0;
  padding: 12px 14px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #e2e8f0;
  background: transparent;
  border: none;
  border-radius: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.log-panel-actions {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px));
  background: transparent;
  border-top: none;
}

.log-panel-btn {
  font: inherit;
  font-weight: 600;
  font-size: 0.75rem;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  color: #fff;
  border: 1px solid #7c3aed;
  background: linear-gradient(165deg, #7c3aed 0%, #6366f1 100%);
  box-shadow: 0 2px 0 #4c1d95;
}

.log-panel-btn:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 #4c1d95;
}

.log-panel-btn:focus-visible {
  outline: 2px solid #a78bfa;
  outline-offset: 2px;
}

.log-panel-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>