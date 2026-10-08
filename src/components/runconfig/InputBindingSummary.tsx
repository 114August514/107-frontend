import { Label, Stack, Text } from '@primer/react'

import type { InputBinding } from '../../api/types'

interface Props {
  bindings: InputBinding[]
  checking: boolean
  preflightOk: boolean | null
}

function availabilityTag(checking: boolean, preflightOk: boolean | null) {
  if (checking) return <Label>检查中</Label>
  if (preflightOk === true) return <Label variant="success">当前可用</Label>
  if (preflightOk === false) return <Label variant="attention">未确认，请查看检查问题</Label>
  return <Label>尚未检查</Label>
}

export function InputBindingSummary({ bindings, checking, preflightOk }: Props) {
  if (bindings.length === 0) return <>—</>

  return (
    <Stack gap="condensed">
      {bindings.map((binding) => (
        <Stack
          key={`${binding.source_type}:${binding.source_id}:${binding.access_path}`}
          direction="horizontal"
          gap="condensed"
          align="center"
          wrap="wrap"
        >
          <Text>
            {binding.source_type === 'shared_resource_version' ? '资源版本' : '运行产物'}{' '}
            {binding.source_id}
          </Text>
          {binding.source_subpath ? (
            <Text style={{ color: 'var(--fgColor-muted)' }}>
              来源子路径 {binding.source_subpath}
            </Text>
          ) : null}
          <Text as="code">输入访问路径 {binding.access_path}</Text>
          {availabilityTag(checking, preflightOk)}
        </Stack>
      ))}
    </Stack>
  )
}
