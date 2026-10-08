import { EditorView } from '@codemirror/view'
import { DownloadIcon, HomeIcon } from '@primer/octicons-react'
import { Button, Label, Text } from '@primer/react'
import CodeMirror from '@uiw/react-codemirror'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api } from '../../api/client'
import { toAsyncError } from '../../api/errors'
import { can } from '../../api/types'
import type { FileContent, Project, ProjectVersionDetail } from '../../api/types'
import styles from './FileViewer.module.css'
import { useAsync } from '../../api/useAsync'
import { AsyncState } from '../common/AsyncState'
import { FileObjectActions } from './FileObjectActions'
import { codeExtensionForPath, previewKind } from './filePreview'
import { MarkdownPreview } from './MarkdownPreview'
interface Props {
  projectId: string
  access: Project | undefined
  path: string
  backHref: string
  rootHref?: string
  version?: ProjectVersionDetail
  onChanged?: () => void
  workingHref?: string
}
export function FileViewer({
  projectId,
  access,
  path,
  backHref,
  rootHref = backHref,
  version,
  onChanged,
  workingHref,
}: Props) {
  const navigate = useNavigate()
  const kind = previewKind(path)
  const editorExtensions = useMemo(() => {
    const extension = codeExtensionForPath(path)
    return extension ? [extension] : []
  }, [path])
  const readOnly = version !== undefined
  const [editing, setEditing] = useState(false)
  const canWrite = !readOnly && can(access, 'project.content.write')
  const fileName = path.split('/').at(-1) ?? path
  const directorySegments = path.split('/').slice(0, -1)
  const directoryHref = (segments: string[]) =>
    segments.length === 0
      ? rootHref
      : `${rootHref}/tree/${segments.map(encodeURIComponent).join('/')}`
  const file = useAsync<FileContent>(
    () => (version ? api.readVersionFile(version.id, path) : api.readFile(projectId, path)),
    [projectId, version?.id, path],
  )
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (file.data) setContent(file.data.content)
  }, [file.data])

  const save = async () => {
    if (!canWrite || !file.data || file.data.truncated) return
    setSaving(true)
    try {
      await api.writeFile(projectId, path, content)
      navigate(backHref)
    } finally {
      setSaving(false)
    }
  }

  const error = toAsyncError(file.error)
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="文件路径">
        <Link to={rootHref} aria-label="返回 Project 文件根目录">
          <HomeIcon size={16} />
        </Link>
        {directorySegments.map((segment, index) => {
          const segments = directorySegments.slice(0, index + 1)
          return (
            <span key={segments.join('/')}>
              <span aria-hidden> / </span>
              <Link to={directoryHref(segments)}>{segment}</Link>
            </span>
          )
        })}
        <span>
          <span aria-hidden> / </span>
          {fileName}
        </span>
      </nav>
      <div className={styles.header}>
        <div>
          <h1>{fileName}</h1>
          {version && <Label variant="accent">{version.label} · 只读</Label>}
        </div>
        <div className={styles.headerActions}>
          {version && workingHref && (
            <Button onClick={() => navigate(workingHref)}>编辑 Working State</Button>
          )}
          {!version && (
            <Button
              leadingVisual={DownloadIcon}
              onClick={() => void api.downloadFile(projectId, path)}
            >
              下载文件
            </Button>
          )}
          <Button onClick={() => navigate(backHref)}>返回 Files</Button>
          {!version && onChanged && (
            <FileObjectActions
              projectId={projectId}
              path={path}
              canWrite={canWrite}
              onChanged={onChanged}
            />
          )}
        </div>
      </div>
      <AsyncState
        loading={file.loading}
        loadingText="正在加载文件…"
        error={error ? { ...error, message: '无法加载文件。' } : undefined}
        onRetry={file.reload}
      >
        {file.data && (
          <div className={styles.viewerCard}>
            {file.data.truncated && (
              <Text style={{ color: 'var(--fgColor-attention)' }}>
                文件过大，只显示开头内容，不能保存。
              </Text>
            )}
            {content.length === 0 ? (
              <p>这个文件没有可显示的内容。</p>
            ) : kind === 'markdown' && (readOnly || !editing) ? (
              <MarkdownPreview content={content} />
            ) : kind === 'text' ? (
              <pre className={styles.codeViewer} tabIndex={0} aria-label={`查看 ${path}`}>
                {content}
              </pre>
            ) : readOnly || !canWrite || file.data.truncated ? (
              <CodeMirror
                className={styles.codeViewer}
                value={content}
                editable={false}
                readOnly
                height="32rem"
                extensions={editorExtensions}
                aria-label={`查看 ${path}`}
              />
            ) : (
              <CodeMirror
                className={styles.editor}
                value={content}
                onChange={setContent}
                height="32rem"
                extensions={[
                  ...editorExtensions,
                  EditorView.contentAttributes.of({ 'aria-label': `编辑 ${path}` }),
                ]}
                aria-label={`编辑 ${path}`}
              />
            )}
            {kind === 'markdown' && canWrite && !file.data.truncated && !editing && (
              <div className={styles.actions}>
                <Button onClick={() => setEditing(true)}>编辑</Button>
              </div>
            )}
            {canWrite && !file.data.truncated && (kind !== 'markdown' || editing) && (
              <div className={styles.actions}>
                <Button variant="primary" onClick={save} loading={saving}>
                  保存
                </Button>
              </div>
            )}
          </div>
        )}
      </AsyncState>
    </div>
  )
}
