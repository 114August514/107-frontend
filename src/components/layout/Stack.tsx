import { Stack as PrimerStack } from '@primer/react'
import type { ReactNode } from 'react'

interface Props {
  gap?: 'small' | 'middle' | 'large'
  children: ReactNode
}

/** 竖排并撑满宽度。间距走 Primer。 */
export function Stack({ gap = 'middle', children }: Props) {
  const gapScale = gap === 'small' ? 'condensed' : gap === 'middle' ? 'normal' : 'spacious'
  return (
    <PrimerStack direction="vertical" gap={gapScale} style={{ width: '100%' }}>
      {children}
    </PrimerStack>
  )
}
