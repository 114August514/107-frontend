import { Banner, Label, Select, Stack, Text } from '@primer/react'
import { useEffect, useMemo, useState } from 'react'

import { api } from '../../api/client'
import type { ChangeKind, ProjectVersionPage, VersionDiff } from '../../api/types'
import { useAsync } from '../../api/useAsync'

const CHANGE_LABEL: Record<ChangeKind, { text: string; variant: 'success' | 'accent' | 'danger' }> =
  {
    added: { text: '新增', variant: 'success' },
    modified: { text: '修改', variant: 'accent' },
    removed: { text: '删除', variant: 'danger' },
  }

interface Props {
  projectId: string
  currentVersionId: string
  currentVersionSequence: number
}

/** 版本比较：当前版本相对选定基准的文件级差异。 */
export function VersionDiffPanel({ projectId, currentVersionId, currentVersionSequence }: Props) {
  const versions = useAsync<ProjectVersionPage>(async () => {
    const all: ProjectVersionPage['items'] = []
    let page = 1
    let resp: ProjectVersionPage
    do {
      resp = await api.listVersions(projectId, { page, page_size: 100 })
      all.push(...resp.items)
      page += 1
    } while (resp.has_more)
    return { ...resp, items: all, has_more: false }
  }, [projectId])

  const baseOptions = useMemo(() => {
    const all = versions.data?.items ?? []
    return all
      .filter((item) => item.id !== currentVersionId)
      .sort((a, b) => b.sequence - a.sequence)
  }, [versions.data, currentVersionId])

  const defaultBase = useMemo(() => {
    return (
      baseOptions.find((item) => item.sequence < currentVersionSequence) ?? baseOptions[0] ?? null
    )
  }, [baseOptions, currentVersionSequence])

  const [baseVersionId, setBaseVersionId] = useState<string | null>(null)

  useEffect(() => {
    if (baseVersionId === null && defaultBase) setBaseVersionId(defaultBase.id)
  }, [defaultBase, baseVersionId])

  const diff = useAsync<VersionDiff[]>(
    async () =>
      baseVersionId ? api.diffVersions(currentVersionId, baseVersionId) : Promise.resolve([]),
    [currentVersionId, baseVersionId],
  )

  if (versions.data && baseOptions.length === 0) {
    return <Banner variant="info" title="这是第一个版本，没有可比较的历史版本" />
  }

  const diffData = diff.data ?? []

  return (
    <Stack gap="normal">
      <Stack direction="horizontal" gap="condensed" align="center">
        <Text>对比基准版本：</Text>
        <Select
          aria-label="对比基准版本"
          value={baseVersionId ?? ''}
          onChange={(event) => setBaseVersionId(event.currentTarget.value)}
        >
          {baseOptions.map((item) => (
            <Select.Option key={item.id} value={item.id}>
              {item.label}
            </Select.Option>
          ))}
        </Select>
      </Stack>
      {diff.error ? <Banner variant="critical" title={diff.error.message} /> : null}
      {baseVersionId && !diff.loading && !diff.error && diffData.length === 0 ? (
        <Banner variant="success" title="两个版本内容完全相同" />
      ) : null}
      {diff.loading ? <Text>正在比较版本…</Text> : null}
      {diffData.length > 0 ? (
        <table aria-label="版本差异">
          <thead>
            <tr>
              <th scope="col">变更</th>
              <th scope="col">路径</th>
            </tr>
          </thead>
          <tbody>
            {diffData.map((item) => (
              <tr key={item.path}>
                <td>
                  <Label variant={CHANGE_LABEL[item.change].variant}>
                    {CHANGE_LABEL[item.change].text}
                  </Label>
                </td>
                <td>{item.path}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Stack>
  )
}
