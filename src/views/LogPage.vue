<template>
  <main class="log-page">
    <header class="log-header">
      <RouterLink class="back" :to="{ name: 'home' }">‹ 返回首页</RouterLink>
      <h1>运行日志</h1>
    </header>
    <p v-if="error" class="message" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="message">正在读取日志…</p>
    <p v-else-if="!logText" class="message">暂无日志内容。</p>
    <pre v-else class="log-content">{{ logText }}</pre>
  </main>
</template>

<script setup lang="ts">
import { log, LogStream } from 'assistsx-js'
import { onMounted, onUnmounted, ref } from 'vue'

const logText = ref('')
const loading = ref(true)
const error = ref('')
let dispose: (() => Promise<void>) | undefined
let unmounted = false
let receivedUpdate = false

onMounted(async () => {
  try {
    const subscription = await log.subscribe(LogStream.entireLogText, ({ text }) => {
      receivedUpdate = true
      logText.value = text
    })
    if (unmounted) {
      await subscription.dispose()
      return
    }
    dispose = subscription.dispose
  } catch {
    // 订阅不可用时仍尝试读取已有日志
  }

  try {
    const text = await log.readAllText()
    if (!receivedUpdate) logText.value = text
  } catch {
    error.value = '读取日志失败，请确认已在 AssistsX 中打开插件。'
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  unmounted = true
  if (dispose) void dispose()
})
</script>

<style scoped>
.log-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 1.1rem 1rem 2rem;
  color: #1f2937;
  background: #f6f8fa;
  font-family: system-ui, -apple-system, sans-serif;
}
.back {
  color: #2563eb;
  font-size: 0.875rem;
  text-decoration: none;
}
.log-header h1 {
  margin: 0.8rem 0 1rem;
  font-size: 1.25rem;
}
.message,
.log-content {
  margin: 0;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  font-size: 0.8125rem;
  line-height: 1.6;
}
.log-content {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
