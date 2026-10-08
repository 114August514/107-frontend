import { ChevronDownIcon, ChevronRightIcon, FileIcon } from '@primer/octicons-react'
import {
  Banner,
  Button,
  ConfirmationDialog,
  Dialog,
  Label,
  Spinner,
  Stack,
  Text,
  TextInput,
} from '@primer/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../../api/client'
import { can } from '../../api/types'
import type {
  ChangeKind,
  Project,
  ProjectVersion,
  ProjectVersionPage,
  WorkingChange,
  WorkingChangeDetail,
} from '../../api/types'
import { useAsync } from '../../api/useAsync'
import { formatBytes, formatTime } from '../../utils/format'
import { tablePagination } from '../../utils/pagination'
import { AsyncSection } from '../common/AsyncSection'
import { ForkModal } from './ForkModal'
import styles from './VersionPanel.module.css'

const CHANGE_LABEL: Record<ChangeKind, { text: string; variant: 'success' | 'accent' | 'danger' }> =
  {
    added: { text: '新增', variant: 'success' },
    modified: { text: '修改', variant: 'accent' },
    removed: { text: '删除', variant: 'danger' },
  }

type VersionPanelSection = 'all' | 'changes' | 'versions'

interface Props {
  section?: VersionPanelSection
  projectId: string
  projectName: string
  access: Project | undefined
  refreshToken: number
  onVersionSaved: () => void
}

/** 版本历史与未保存变更。恢复历史版本改的是工作区，不会改那个版本。 */
export function VersionPanel({
  section = 'all',
  projectId,
  projectName,
  access,
  refreshToken,
  onVersionSaved,
}: Props) {
  const showChanges = section !== 'versions'
  const showVersions = section !== 'changes'
  const navigate = useNavigate()
  const [forking, setForking] = useState<ProjectVersion | null>(null)
  const [inspecting, setInspecting] = useState<WorkingChange | null>(null)
  const [restoring, setRestoring] = useState<ProjectVersion | null>(null)
  const [notice, setNotice] = useState<{ variant: 'success' | 'critical'; text: string } | null>(
    null,
  )
  const canWrite = can(access, 'project.content.write')
  const [page, setPage] = useState(1)
  const versions = useAsync<ProjectVersionPage>(
    () => api.listVersions(projectId, { page }),
    [projectId, refreshToken, page],
  )
  const changes = useAsync<WorkingChange[]>(
    () => api.workingChanges(projectId),
    [projectId, refreshToken],
  )
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [changesExpanded, setChangesExpanded] = useState(true)
  const pending = changes.data ?? []
  const pagination = tablePagination(versions.data, setPage)

  const save = async () => {
    setSaving(true)
    try {
      const version = await api.saveVersion(projectId, message)
      setNotice({ variant: 'success', text: `已保存 ${version.label}` })
      setMessage('')
      versions.reload()
      changes.reload()
      onVersionSaved()
    } catch (error) {
      setNotice({ variant: 'critical', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const restore = async (version: ProjectVersion) => {
    try {
      await api.restoreVersion(version.id)
      setNotice({ variant: 'success', text: `工作区已恢复到 ${version.label}` })
      changes.reload()
      onVersionSaved()
    } catch (error) {
      setNotice({ variant: 'critical', text: (error as Error).message })
    }
  }

  return (
    <div className={styles.panel}>
      {notice ? <Banner variant={notice.variant} title={notice.text} /> : null}
      {showChanges && (
        <>
          <AsyncSection loading={changes.loading} error={changes.error}>
            {pending.length > 0 ? (
              <section className={styles.changesSection} aria-labelledby="working-changes-title">
                <button
                  className={styles.changesHeader}
                  type="button"
                  aria-expanded={changesExpanded}
                  onClick={() => setChangesExpanded((expanded) => !expanded)}
                >
                  {changesExpanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
                  <span id="working-changes-title">变更</span>
                  <span className={styles.changeCount}>{pending.length}</span>
                </button>
                {changesExpanded && (
                  <div className={styles.changeList}>
                    {pending.map((change) => (
                      <button
                        key={change.path}
                        type="button"
                        className={styles.changeRow}
                        aria-label={`${change.change === 'modified' ? '修改' : change.change === 'added' ? '新增' : '删除'} ${change.path}`}
                        onClick={() => setInspecting(change)}
                      >
                        <FileIcon size={16} />
                        <span className={styles.changePath}>{change.path}</span>
                        <span className={styles.changeSource}>
                          {projectName || 'Working State'}
                        </span>
                        <span className={`${styles.changeStatus} ${styles[change.change]}`}>
                          {change.change === 'modified'
                            ? 'M'
                            : change.change === 'added'
                              ? 'A'
                              : 'D'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </AsyncSection>
          {canWrite && (
            <div className={styles.saveRow}>
              <TextInput
                aria-label="版本说明"
                placeholder="这次改了什么"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && pending.length > 0 && !saving) void save()
                }}
                block
              />
              <Button
                variant="primary"
                onClick={() => void save()}
                loading={saving}
                disabled={pending.length === 0}
              >
                保存 Project Version
              </Button>
            </div>
          )}
          <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>
            Run 只能从确定的 Project Version 发起。保存版本之后，这份内容就固定下来了。
          </Text>
        </>
      )}
      {showVersions && (
        <AsyncSection
          loading={versions.loading}
          error={versions.error}
          empty={versions.data?.total === 0}
          emptyText="还没有保存过版本"
        >
          <table className={styles.versionTable} aria-label="Project 版本">
            <thead>
              <tr>
                <th scope="col">版本</th>
                <th scope="col">说明</th>
                <th scope="col">文件数</th>
                <th scope="col">总大小</th>
                <th scope="col">保存时间</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {(versions.data?.items ?? []).map((version) => (
                <tr key={version.id}>
                  <td>
                    <Label variant="accent">{version.label}</Label>
                  </td>
                  <td>{version.message}</td>
                  <td>{version.file_count}</td>
                  <td>{formatBytes(version.total_size)}</td>
                  <td>{formatTime(version.created_at)}</td>
                  <td>
                    <div className={styles.actions}>
                      <Button
                        variant="invisible"
                        size="small"
                        onClick={() =>
                          navigate(`/projects/${projectId}/files/versions/${version.id}`)
                        }
                      >
                        查看详情
                      </Button>
                      {canWrite ? (
                        <Button
                          variant="invisible"
                          size="small"
                          onClick={() => setRestoring(version)}
                        >
                          恢复到此版本
                        </Button>
                      ) : null}
                      <Button variant="invisible" size="small" onClick={() => setForking(version)}>
                        派生
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination && pagination.total > pagination.pageSize ? (
            <div className={styles.pager}>
              <Button
                size="small"
                disabled={pagination.current <= 1}
                onClick={() => pagination.onChange(pagination.current - 1)}
              >
                上一页
              </Button>
              <Button
                size="small"
                disabled={pagination.current * pagination.pageSize >= pagination.total}
                onClick={() => pagination.onChange(pagination.current + 1)}
              >
                下一页
              </Button>
            </div>
          ) : null}
        </AsyncSection>
      )}
      {showVersions ? (
        <ForkModal
          open={forking !== null}
          version={forking}
          sourceProjectName={projectName}
          onClose={() => setForking(null)}
          onForked={(project) => navigate(`/projects/${project.id}`)}
        />
      ) : null}
      {restoring ? (
        <ConfirmationDialog
          title={`把工作区恢复到 ${restoring.label}？`}
          onClose={(gesture) => {
            if (gesture === 'confirm') void restore(restoring)
            setRestoring(null)
          }}
          confirmButtonContent="恢复"
        >
          当前未保存的修改会被覆盖。历史版本本身不受影响。
        </ConfirmationDialog>
      ) : null}
      {showChanges ? (
        <ChangeDetailDialog
          projectId={projectId}
          change={inspecting}
          changes={pending}
          canWrite={canWrite}
          onSelect={setInspecting}
          onClose={() => setInspecting(null)}
          onDiscarded={() => {
            changes.reload()
            onVersionSaved()
          }}
          onNotice={setNotice}
        />
      ) : null}
    </div>
  )
}

function ChangeDetailDialog({
  projectId,
  change,
  changes,
  canWrite,
  onSelect,
  onClose,
  onDiscarded,
  onNotice,
}: {
  projectId: string
  change: WorkingChange | null
  changes: WorkingChange[]
  canWrite: boolean
  onSelect: (change: WorkingChange) => void
  onClose: () => void
  onDiscarded: () => void
  onNotice: (notice: { variant: 'success' | 'critical'; text: string }) => void
}) {
  const [detail, setDetail] = useState<WorkingChangeDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const [discarding, setDiscarding] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    if (!change) return
    let cancelled = false
    setLoading(true)
    setDetail(null)
    setLoadError(null)
    api
      .workingChangeDetail(projectId, change.path, change.base_version ?? null)
      .then((result) => {
        if (!cancelled) setDetail(result)
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError((error as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, change, retryToken])

  if (!change) return null

  const discard = async () => {
    setDiscarding(true)
    try {
      await api.discardChanges(projectId, [change.path])
      onNotice({ variant: 'success', text: `已放弃 ${change.path} 的未保存变更` })
      onClose()
      onDiscarded()
    } catch (error) {
      onNotice({ variant: 'critical', text: (error as Error).message })
    } finally {
      setDiscarding(false)
    }
  }

  return (
    <Dialog
      title={change.path}
      width="xlarge"
      onClose={onClose}
      footerButtons={
        canWrite
          ? [
              {
                content: '放弃此变更',
                buttonType: 'danger',
                disabled: discarding,
                loading: discarding,
                onClick: () => setConfirmDiscard(true),
              },
            ]
          : undefined
      }
    >
      <div className={styles.detailBody}>
        <div className={styles.changePicker}>
          <Text weight="semibold">更改 ({changes.length})</Text>
          {changes.map((item) => (
            <Button
              key={item.path}
              variant={item.path === change.path ? 'primary' : 'invisible'}
              onClick={() => onSelect(item)}
              style={{ justifyContent: 'flex-start' }}
            >
              <Label variant={CHANGE_LABEL[item.change].variant}>
                {item.change === 'modified' ? 'M' : item.change === 'added' ? 'A' : 'D'}
              </Label>
              {item.path}
            </Button>
          ))}
        </div>
        {loading ? (
          <Spinner />
        ) : loadError ? (
          <Banner variant="critical" title="无法加载变更详情">
            <Banner.Description>
              <Stack gap="condensed">
                <Text>{loadError}</Text>
                <Button onClick={() => setRetryToken((current) => current + 1)}>重试</Button>
              </Stack>
            </Banner.Description>
          </Banner>
        ) : detail ? (
          <Stack gap="normal">
            <Stack direction="horizontal" gap="condensed" align="center">
              <Label variant={CHANGE_LABEL[detail.change].variant}>
                {CHANGE_LABEL[detail.change].text}
              </Label>
              {detail.previous?.truncated ? (
                <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>
                  基线内容过长，仅显示前 256 KB
                </Text>
              ) : null}
              {detail.current?.truncated ? (
                <Text size="small" style={{ color: 'var(--fgColor-muted)' }}>
                  工作区内容过长，仅显示前 256 KB
                </Text>
              ) : null}
            </Stack>
            <DiffView
              previous={detail.previous?.content ?? null}
              current={detail.current?.content ?? null}
              previousEmpty="此路径在基线版本中不存在"
              currentEmpty="文件已被删除"
            />
          </Stack>
        ) : null}
      </div>
      {confirmDiscard ? (
        <ConfirmationDialog
          title={`放弃 ${change.path} 的未保存变更？`}
          onClose={(gesture) => {
            if (gesture === 'confirm') void discard()
            setConfirmDiscard(false)
          }}
          confirmButtonContent="放弃变更"
          confirmButtonType="danger"
        >
          工作区会恢复到最近保存版本的内容。历史版本不受影响，但这次修改无法找回。
        </ConfirmationDialog>
      ) : null}
    </Dialog>
  )
}

function DiffView({
  previous,
  current,
  previousEmpty,
  currentEmpty,
}: {
  previous: string | null
  current: string | null
  previousEmpty: string
  currentEmpty: string
}) {
  if (previous === null || current === null) {
    return (
      <Text style={{ color: 'var(--fgColor-muted)' }}>
        {previous === null ? previousEmpty : currentEmpty}
      </Text>
    )
  }
  const oldLines = previous.split('\n')
  const newLines = current.split('\n')
  const rows: Array<{
    kind: 'same' | 'remove' | 'add'
    old: number | ''
    next: number | ''
    text: string
  }> = []
  let oldIndex = 0
  let nextIndex = 0
  while (oldIndex < oldLines.length || nextIndex < newLines.length) {
    if (oldLines[oldIndex] === newLines[nextIndex]) {
      rows.push({
        kind: 'same',
        old: oldIndex + 1,
        next: nextIndex + 1,
        text: oldLines[oldIndex] ?? '',
      })
      oldIndex += 1
      nextIndex += 1
    } else if (
      oldIndex < oldLines.length &&
      (nextIndex >= newLines.length || !newLines.slice(nextIndex + 1).includes(oldLines[oldIndex]!))
    ) {
      rows.push({ kind: 'remove', old: oldIndex + 1, next: '', text: oldLines[oldIndex]! })
      oldIndex += 1
    } else {
      rows.push({ kind: 'add', old: '', next: nextIndex + 1, text: newLines[nextIndex] ?? '' })
      nextIndex += 1
    }
  }
  return (
    <div className={styles.diff}>
      {rows.map((row, index) => (
        <div
          key={`${row.kind}-${index}`}
          className={`${styles.diffRow} ${row.kind === 'remove' ? styles.diffRemove : ''} ${row.kind === 'add' ? styles.diffAdd : ''}`}
        >
          <span className={styles.diffNumber}>{row.old}</span>
          <span className={styles.diffNumber}>{row.next}</span>
          <span className={styles.diffText}>
            <b>{row.kind === 'remove' ? '−' : row.kind === 'add' ? '+' : ' '}</b> {row.text}
          </span>
        </div>
      ))}
    </div>
  )
}
