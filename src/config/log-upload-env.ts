/**
 * 从 Vite 环境变量解析日志上报的 baseUrl（可选）与 uploadKey（缺省用仓库示例默认值）。
 * 优先级：VITE_LOG_SERVICE_BASE_URL >（VITE_LOG_SERVICE_HOST + VITE_LOG_SERVICE_PORT + 协议）
 */

/** 与宿主端 uploadLogs / AssistsLogDiagnostics 的 uploadKey 一致（未配置 VITE_LOG_UPLOAD_KEY 时使用） */
export const DEFAULT_LOG_UPLOAD_KEY =
  'ulk_Y7MnauToi6rS8Ioi5G-HLuIsxQMvGFb45mw1Y91_xi0'

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

export interface LogUploadEnvResolved {
  /** 配置了日志服务 origin 时传给 uploadLogs，并用于成功提示；未配置则为 undefined（走宿主默认） */
  logServiceBaseUrl: string | undefined
  uploadKey: string
}

/**
 * 构建期解析一次即可；VITE_* 在打包时注入，运行时不变。
 */
export function getLogUploadEnv(): LogUploadEnvResolved {
  const env = import.meta.env

  const keyRaw = env.VITE_LOG_UPLOAD_KEY as string | undefined
  const uploadKey =
    keyRaw !== undefined && String(keyRaw).trim() !== ''
      ? String(keyRaw).trim()
      : DEFAULT_LOG_UPLOAD_KEY

  const baseUrlRaw = env.VITE_LOG_SERVICE_BASE_URL as string | undefined
  if (baseUrlRaw !== undefined && String(baseUrlRaw).trim() !== '') {
    return {
      logServiceBaseUrl: normalizeOrigin(String(baseUrlRaw)),
      uploadKey,
    }
  }

  const host = (env.VITE_LOG_SERVICE_HOST as string | undefined)?.trim()
  const port = (env.VITE_LOG_SERVICE_PORT as string | undefined)?.trim()
  if (host && port) {
    const protoRaw =
      (env.VITE_LOG_SERVICE_PROTOCOL as string | undefined)?.trim() || 'https'
    const protocol = protoRaw.replace(/:\/?$/, '')
    const origin = `${protocol}://${host}:${port}`
    return {
      logServiceBaseUrl: normalizeOrigin(origin),
      uploadKey,
    }
  }

  return {
    logServiceBaseUrl: undefined,
    uploadKey,
  }
}
