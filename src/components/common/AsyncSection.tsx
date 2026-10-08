import type { ReactNode } from 'react'

import { ApiError, NetworkError } from '../../api/client'
import { toAsyncError } from '../../api/errors'
import { AsyncState } from './AsyncState'

interface Props {
  loading: boolean
  error: Error | undefined
  /** 错误恢复回调；提供时在错误提示上渲染「重试」。 */
  onRetry?: () => void
  /** 网络错误或非结构化 http_error 的上下文主提示；未提供时使用默认 copy。 */
  errorTitle?: string
  empty?: boolean
  emptyText?: string
  children: ReactNode
}

/**
 * 异步三态入口。展示交给 AsyncState。
 */
export function AsyncSection({
  loading,
  error,
  onRetry,
  errorTitle,
  empty,
  emptyText,
  children,
}: Props) {
  if (error) {
    const view = toAsyncError(error)
    if (!view) return null
    const isUnstructured =
      error instanceof NetworkError || (error instanceof ApiError && error.code === 'http_error')
    return (
      <AsyncState
        loading={false}
        loadingText="正在加载…"
        error={isUnstructured && errorTitle ? { ...view, message: errorTitle } : view}
        onRetry={onRetry}
      >
        {null}
      </AsyncState>
    )
  }

  return (
    <AsyncState
      loading={loading}
      loadingText="正在加载…"
      empty={empty}
      emptyText={emptyText}
      onRetry={onRetry}
    >
      {children}
    </AsyncState>
  )
}
