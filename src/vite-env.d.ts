/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOG_UPLOAD_KEY?: string
  readonly VITE_LOG_SERVICE_BASE_URL?: string
  readonly VITE_LOG_SERVICE_HOST?: string
  readonly VITE_LOG_SERVICE_PORT?: string
  readonly VITE_LOG_SERVICE_PROTOCOL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

export {}
