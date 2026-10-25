<template>
  <div class="app-root" :class="{ 'app-root--full-bleed': isFullBleed }">
    <RouterView />
    <A11yGuideDialog />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import A11yGuideDialog from './components/A11yGuideDialog.vue'
import './app.css'

const route = useRoute()

const FLOAT_ROUTES = ['runner', 'logPanel']

const isFullBleed = computed(() => FLOAT_ROUTES.includes(String(route.name)))

/** 浮窗全屏页：无 inline=1 时根透明，与 assistsx-log-simple 一致 */
function syncFullBleedRootClass(): void {
  const name = String(route.name)
  const q = route.query.inline
  const isBleed = FLOAT_ROUTES.includes(name)
  const isInline = q === '1' || (Array.isArray(q) && q[0] === '1')
  document.documentElement.classList.toggle(
    'test-float-transparent',
    isBleed && !isInline,
  )
  document.documentElement.classList.toggle(
    'test-float-inline',
    isBleed && isInline,
  )
}

watch(
  () => [route.name, route.query.inline] as const,
  syncFullBleedRootClass,
  { immediate: true },
)
</script>
