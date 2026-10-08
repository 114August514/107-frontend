import { Button, ConfirmationDialog, Label, Text } from '@primer/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api } from '../api/client'
import { can } from '../api/types'
import type { Project, ProjectVersionDetail } from '../api/types'
import { useAsync } from '../api/useAsync'
import { AsyncSection } from '../components/common/AsyncSection'
import { PageHeader } from '../components/layout/PageHeader'
import { Stack } from '../components/layout/Stack'
import { ForkModal } from '../components/project/ForkModal'
import { VersionDiffPanel } from '../components/project/VersionDiffPanel'
import { FileBrowser } from '../components/project/FileBrowser'
import { RunFromVersionModal } from '../components/run/RunFromVersionModal'
import { formatBytes, formatTime } from '../utils/format'

export function VersionDetailPage() {
  const { versionId = '' } = useParams()
  const navigate = useNavigate()
  const [forking, setForking] = useState(false)
  const [running, setRunning] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [tab, setTab] = useState<'files' | 'diff'>('files')
  const [notice, setNotice] = useState<string | null>(null)

  const version = useAsync<ProjectVersionDetail>(() => api.getVersion(versionId), [versionId])
  const project = useAsync<Project | undefined>(
    async () => (version.data ? api.getProject(version.data.project_id) : undefined),
    [version.data?.project_id],
  )

  const canWrite = can(project.data, 'project.content.write')
  const canRun = can(project.data, 'run.submit')

  const restore = async () => {
    if (!version.data || !project.data) return
    try {
      await api.restoreVersion(versionId)
      navigate(`/projects/${version.data.project_id}`)
    } catch (error) {
      setNotice((error as Error).message)
    }
  }

  return (
    <Stack gap="large">
      {notice ? <Text style={{ color: 'var(--fgColor-danger)' }}>{notice}</Text> : null}
      <AsyncSection loading={version.loading} error={version.error}>
        {version.data && project.data && (
          <PageHeader
            breadcrumb={[
              { title: <Link to="/">首页</Link> },
              {
                title:
                  project.data.owner.kind === 'user_group' ? (
                    <Link to={`/user-groups/${project.data.owner.id}`}>
                      {project.data.owner.display_name}
                    </Link>
                  ) : (
                    project.data.owner.display_name
                  ),
              },
              {
                title: <Link to={`/projects/${project.data.id}`}>{project.data.name}</Link>,
              },
              { title: `Version ${version.data.label}` },
            ]}
            title={version.data.label}
            tags={<Label variant="accent">不可变版本</Label>}
            description={version.data.message}
            actions={
              <>
                {canRun && (
                  <Button variant="primary" onClick={() => setRunning(true)}>
                    运行此版本
                  </Button>
                )}
                {canWrite && <Button onClick={() => setConfirmRestore(true)}>恢复到此版本</Button>}
                <Button onClick={() => setForking(true)}>派生</Button>
              </>
            }
          />
        )}
      </AsyncSection>

      {version.data && (
        <Stack>
          <AsyncSection loading={version.loading} error={version.error}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--base-size-16)' }}>
              <Text style={{ color: 'var(--fgColor-muted)' }}>
                创建人：{version.data.created_by}
              </Text>
              <Text style={{ color: 'var(--fgColor-muted)' }}>
                保存时间：{formatTime(version.data.created_at)}
              </Text>
              <Text style={{ color: 'var(--fgColor-muted)' }}>
                文件数：{version.data.file_count}
              </Text>
              <Text style={{ color: 'var(--fgColor-muted)' }}>
                总大小：{formatBytes(version.data.total_size)}
              </Text>
            </div>
          </AsyncSection>

          <div role="tablist" aria-label="版本内容">
            <Button
              role="tab"
              aria-selected={tab === 'files'}
              variant={tab === 'files' ? 'primary' : 'invisible'}
              onClick={() => setTab('files')}
            >
              文件
            </Button>
            <Button
              role="tab"
              aria-selected={tab === 'diff'}
              variant={tab === 'diff' ? 'primary' : 'invisible'}
              onClick={() => setTab('diff')}
            >
              版本比较
            </Button>
          </div>
          {tab === 'files' ? (
            <FileBrowser
              projectId={version.data.project_id}
              access={project.data}
              onChanged={() => undefined}
              basePath={`/projects/${version.data.project_id}/files/versions/${version.data.id}`}
              version={version.data}
            />
          ) : (
            <VersionDiffPanel
              projectId={version.data.project_id}
              currentVersionId={versionId}
              currentVersionSequence={version.data.sequence}
            />
          )}
        </Stack>
      )}

      {version.data && (
        <>
          <RunFromVersionModal
            open={running}
            versionId={versionId}
            versionLabel={version.data.label}
            projectId={version.data.project_id}
            defaultRunConfigurationId={project.data?.default_run_configuration_id ?? null}
            onClose={() => setRunning(false)}
            onSubmitted={(run) => navigate(`/projects/${run.project_id}/runs/${run.id}`)}
          />
          <ForkModal
            open={forking}
            version={version.data}
            sourceProjectName={project.data?.name ?? ''}
            onClose={() => setForking(false)}
            onForked={(created) => navigate(`/projects/${created.id}`)}
          />
        </>
      )}
      {confirmRestore && version.data ? (
        <ConfirmationDialog
          title={`把工作区恢复到 ${version.data.label}？`}
          onClose={(gesture) => {
            if (gesture === 'confirm') void restore()
            setConfirmRestore(false)
          }}
          confirmButtonContent="恢复"
        >
          当前未保存的修改会被覆盖。历史版本本身不受影响。
        </ConfirmationDialog>
      ) : null}
    </Stack>
  )
}
