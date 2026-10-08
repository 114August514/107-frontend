import {
  Banner,
  Dialog,
  FormControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@primer/react'
import { useState } from 'react'

import { api } from '../../api/client'
import { toAsyncError } from '../../api/errors'
import type { Project, ProjectVersion, UserGroup } from '../../api/types'
import { useAsync } from '../../api/useAsync'

interface Props {
  open: boolean
  version: ProjectVersion | null
  sourceProjectName: string
  onClose: () => void
  onForked: (project: Project) => void
}

/**
 * 从一个确定版本派生新 Project。
 * 目标列表来自当前用户的 User Group；能否创建仍由后端判定。
 */
export function ForkModal({ open, version, sourceProjectName, onClose, onForked }: Props) {
  if (!open || !version) return null
  return (
    <ForkForm
      version={version}
      sourceProjectName={sourceProjectName}
      onClose={onClose}
      onForked={onForked}
    />
  )
}

function ForkForm({
  version,
  sourceProjectName,
  onClose,
  onForked,
}: {
  version: ProjectVersion
  sourceProjectName: string
  onClose: () => void
  onForked: (project: Project) => void
}) {
  const writableGroups = useAsync<UserGroup[]>(() => api.listUserGroups(), [])
  const [ownerId, setOwnerId] = useState('')
  const [name, setName] = useState(sourceProjectName)
  const [description, setDescription] = useState('')
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    const nextName = name.trim()
    let invalid = false
    if (!ownerId) {
      setOwnerError('请选择目标 User Group')
      invalid = true
    } else {
      setOwnerError(null)
    }
    if (!nextName) {
      setNameError('请填写名称')
      invalid = true
    } else {
      setNameError(null)
    }
    if (invalid) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const project = await api.forkVersion(version.id, {
        target_owner: { kind: 'user_group', id: ownerId },
        name: nextName,
        description: description.trim(),
      })
      onForked(project)
      onClose()
    } catch (error) {
      setSubmitError(toAsyncError(error as Error)?.message ?? (error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      title={`从 ${version.label} 派生新 Project`}
      width="large"
      onClose={() => {
        if (!submitting) onClose()
      }}
      footerButtons={[
        { content: '取消', disabled: submitting, onClick: onClose },
        {
          content: '创建',
          buttonType: 'primary',
          disabled: submitting,
          loading: submitting,
          onClick: () => void submit(),
        },
      ]}
    >
      <Stack gap="normal">
        <Banner variant="info" title="复制的是内容和运行方案，不是权限">
          <Banner.Description>
            资源权益、成员权限、Secret 的值和 Run 历史都不会跟过去。运行方案里的 Secret
            引用会一起复制，但需要你在目标 User Group 配置同名 Secret 才能跑起来。
          </Banner.Description>
        </Banner>
        {writableGroups.error ? (
          <Banner variant="critical" title="无法加载可创建 Project 的 User Group">
            <Banner.Description>{writableGroups.error.message}</Banner.Description>
          </Banner>
        ) : null}
        {submitError ? (
          <Banner variant="critical">
            <Banner.Title>{submitError}</Banner.Title>
          </Banner>
        ) : null}
        <FormControl
          required
          id="fork-owner"
          disabled={Boolean(writableGroups.error) || writableGroups.loading || submitting}
        >
          <FormControl.Label>创建到哪个 User Group</FormControl.Label>
          <Select
            aria-label="创建到哪个 User Group"
            value={ownerId}
            onChange={(event) => setOwnerId(event.currentTarget.value)}
          >
            <Select.Option value="">选择一个你能建 Project 的 User Group</Select.Option>
            {(writableGroups.data ?? []).map((group) => (
              <Select.Option key={group.id} value={group.id}>
                {group.name}
              </Select.Option>
            ))}
          </Select>
          {ownerError ? (
            <FormControl.Validation variant="error">{ownerError}</FormControl.Validation>
          ) : null}
        </FormControl>
        <FormControl required id="fork-name">
          <FormControl.Label>新 Project 名称</FormControl.Label>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} block />
          {nameError ? (
            <FormControl.Validation variant="error">{nameError}</FormControl.Validation>
          ) : null}
        </FormControl>
        <FormControl id="fork-description">
          <FormControl.Label>说明</FormControl.Label>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="可选"
            rows={2}
            block
          />
        </FormControl>
        <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>
          派生之后两边互不影响：源项目后续的修改不会同步过来，你的修改也不会回到源项目。
        </Text>
      </Stack>
    </Dialog>
  )
}
