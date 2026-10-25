<template>
  <div v-if="guideVisible" class="a11y-mask" role="dialog" aria-modal="true" aria-label="开启无障碍服务">
    <div class="a11y-card">
      <h3 class="a11y-title">需要先开启无障碍服务</h3>
      <p class="a11y-text">
        浮窗与自动化操作都依赖无障碍服务，未开启时页面无法正常打开与执行。
      </p>
      <ol class="a11y-steps">
        <li>点下方「去开启无障碍」，进入系统设置</li>
        <li>在列表中找到本应用的服务，打开开关</li>
        <li>返回本页点「我已开启，重新检测」</li>
      </ol>
      <p v-if="hint" class="a11y-hint">{{ hint }}</p>
      <div class="a11y-actions">
        <button type="button" class="a11y-btn a11y-btn--primary" @click="openA11ySettings">
          去开启无障碍
        </button>
        <button type="button" class="a11y-btn" :disabled="checking" @click="recheckA11y">
          {{ checking ? '检测中…' : '我已开启，重新检测' }}
        </button>
        <button type="button" class="a11y-btn a11y-btn--minor" @click="dismissA11yGuide">
          暂不
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { dismissA11yGuide, openA11ySettings, recheckA11y, useA11yGuard } from '../composables/useA11yGuard'

defineOptions({ name: 'A11yGuideDialog' })

const { guideVisible, checking, hint } = useA11yGuard()
</script>

<style scoped>
.a11y-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(0, 0, 0, 0.45);
  box-sizing: border-box;
}
.a11y-card {
  width: 100%;
  max-width: 22rem;
  background: #fff;
  border-radius: 12px;
  padding: 1.1rem 1.15rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
  font-family: system-ui, sans-serif;
  color: #1f2328;
}
.a11y-title {
  font-size: 1rem;
  font-weight: 600;
}
.a11y-text {
  margin-top: 0.55rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: #444;
}
.a11y-steps {
  margin: 0.6rem 0 0;
  padding-left: 1.15rem;
  font-size: 0.8125rem;
  line-height: 1.8;
  color: #333;
}
.a11y-hint {
  margin-top: 0.7rem;
  padding: 0.45rem 0.55rem;
  border-radius: 6px;
  background: #fff8e1;
  color: #8a6100;
  font-size: 0.75rem;
  line-height: 1.55;
}
.a11y-actions {
  margin-top: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.a11y-btn {
  padding: 0.45rem 0.8rem;
  font-size: 0.8125rem;
  cursor: pointer;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #f8f9fa;
}
.a11y-btn:hover:enabled {
  background: #eef0f2;
}
.a11y-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.a11y-btn--primary {
  border-color: #0b6bcb;
  background: #0b6bcb;
  color: #fff;
}
.a11y-btn--primary:hover {
  background: #0a5cae;
}
.a11y-btn--minor {
  margin-left: auto;
  color: #6a737d;
}
</style>
