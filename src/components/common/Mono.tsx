import { Text } from '@primer/react'

import { formatRelative, formatTime } from '../../utils/format'

interface MonoProps {
  children: string
  /** 只显示前若干个字符。ID 很长而前几位已经够区分了。 */
  truncate?: number
  copyable?: boolean
}

/** 标识符等宽显示。字体使用 Primer monospace。 */
export function Mono({ children, truncate, copyable }: MonoProps) {
  const shown =
    truncate && children.length > truncate ? `${children.slice(0, truncate)}…` : children
  return (
    <Text
      as="code"
      size="small"
      title={shown === children ? undefined : children}
      style={{ fontFamily: 'var(--fontStack-monospace)' }}
      onClick={
        copyable
          ? () => {
              void navigator.clipboard?.writeText(children)
            }
          : undefined
      }
    >
      {shown}
    </Text>
  )
}

/** 相对时间，title 保留精确时刻。 */
export function RelativeTime({ value }: { value: string | null | undefined }) {
  if (!value) {
    return (
      <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>
        —
      </Text>
    )
  }
  return (
    <time dateTime={value} title={formatTime(value)}>
      <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>
        {formatRelative(value)}
      </Text>
    </time>
  )
}
