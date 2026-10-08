// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FileViewer } from '../../src/components/project/FileViewer'
import type { Project, ProjectVersionDetail } from '../../src/api/types'

const mocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  readVersionFile: vi.fn(),
  writeFile: vi.fn(),
  downloadFile: vi.fn(),
  movePath: vi.fn(),
  copyPath: vi.fn(),
  deletePath: vi.fn(),
}))

vi.mock('../../src/api/client', () => ({ api: mocks }))
vi.mock('@uiw/react-codemirror', () => ({
  default: ({
    value,
    onChange,
    readOnly,
    ...props
  }: {
    value: string
    onChange?: (value: string) => void
    readOnly?: boolean
    'aria-label'?: string
  }) =>
    readOnly ? (
      <pre aria-label={props['aria-label']}>{value}</pre>
    ) : (
      <textarea
        aria-label={props['aria-label']}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    ),
}))

const project: Project = {
  capabilities: ['project.content.write'],
  created_at: null,
  created_by: 'user-1',
  default_run_configuration_id: null,
  description: '',
  environment_version_id: null,
  id: 'project-1',
  name: 'Project',
  owner: { display_name: 'Owner', id: 'user-1', kind: 'user' },
  status: 'active',
  updated_at: null,
  visibility: 'owner_scope',
}

const version = { id: 'version-1', label: 'v1' } as ProjectVersionDetail

function renderViewer(props: { version?: ProjectVersionDetail; access?: Project }) {
  return render(
    <MemoryRouter>
      <FileViewer
        projectId="project-1"
        access={props.access ?? project}
        path="train.py"
        backHref="/projects/project-1/files"
        version={props.version}
      />
    </MemoryRouter>,
  )
}

describe('FileViewer', () => {
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('renders a read-only version without edit controls', async () => {
    mocks.readVersionFile.mockResolvedValue({
      path: 'train.py',
      content: 'print(1)',
      truncated: false,
    })

    renderViewer({ version })

    expect(await screen.findByText('v1 · 只读')).toBeVisible()
    expect(await screen.findByText('print(1)')).toBeVisible()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
  })

  it('edits and saves a working-state file', async () => {
    mocks.readFile.mockResolvedValue({ path: 'train.py', content: 'print(1)', truncated: false })
    mocks.writeFile.mockResolvedValue(undefined)

    renderViewer({})

    const editor = await screen.findByRole('textbox', { name: '编辑 train.py' })
    fireEvent.change(editor, { target: { value: 'print(2)' } })
    fireEvent.click(await screen.findByRole('button', { name: /保\s*存/ }))

    await waitFor(() =>
      expect(mocks.writeFile).toHaveBeenCalledWith('project-1', 'train.py', 'print(2)'),
    )
  })
  it('keeps file actions in the file header', async () => {
    mocks.readFile.mockResolvedValue({ path: 'train.py', content: 'print(1)', truncated: false })

    render(
      <MemoryRouter>
        <FileViewer
          projectId="project-1"
          access={project}
          path="train.py"
          backHref="/projects/project-1/files"
          onChanged={() => {}}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: '下载文件' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '更多文件操作 train.py' }))
    expect(await screen.findByRole('menuitem', { name: '重命名' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: '复制' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: '删除' })).toBeVisible()
  })

  it('renders Markdown structure and does not execute raw HTML', async () => {
    mocks.readVersionFile.mockResolvedValue({
      path: 'README.md',
      truncated: false,
      content: [
        '# 训练',
        '',
        '- 准备数据',
        '',
        '[说明](https://example.com/docs)',
        '',
        '| 阶段 | 状态 |',
        '| --- | --- |',
        '| 训练 | 完成 |',
        '',
        '- [ ] 写结论',
        '',
        '```python',
        'print(1)',
        '```',
        '',
        '<script>alert(1)</script>',
      ].join('\n'),
    })

    const view = render(
      <MemoryRouter>
        <FileViewer
          projectId="project-1"
          access={project}
          path="README.md"
          backHref="/projects/project-1/files"
          version={version}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '训练' })).toBeVisible()
    expect(screen.getByText('准备数据')).toBeVisible()
    expect(screen.getByRole('link', { name: '说明' })).toHaveAttribute(
      'href',
      'https://example.com/docs',
    )
    expect(screen.getByRole('table')).toBeVisible()
    expect(screen.getByRole('checkbox')).toBeDisabled()
    expect(screen.getByText('写结论')).toBeVisible()
    expect(screen.getByLabelText('python 代码')).toHaveTextContent('print(1)')
    expect(view.container.querySelector('script')).toBeNull()
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
  })

  it('shows unknown text as plain text and empty files without a preview error', async () => {
    mocks.readVersionFile.mockResolvedValue({
      path: 'notes.xyz',
      content: 'just text',
      truncated: false,
    })
    const view = render(
      <MemoryRouter>
        <FileViewer
          projectId="project-1"
          access={project}
          path="notes.xyz"
          backHref="/projects/project-1/files"
          version={version}
        />
      </MemoryRouter>,
    )
    expect(await screen.findByLabelText('查看 notes.xyz')).toHaveTextContent('just text')

    mocks.readFile.mockResolvedValue({ path: 'empty.txt', content: '', truncated: false })
    view.rerender(
      <MemoryRouter>
        <FileViewer
          projectId="project-1"
          access={project}
          path="empty.txt"
          backHref="/projects/project-1/files"
        />
      </MemoryRouter>,
    )
    expect(await screen.findByText('这个文件没有可显示的内容。')).toBeVisible()
  })

  it('lets a writer edit Markdown only after leaving the preview', async () => {
    mocks.readFile.mockResolvedValue({
      path: 'README.md',
      content: '# 标题\n',
      truncated: false,
    })
    mocks.writeFile.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <FileViewer
          projectId="project-1"
          access={project}
          path="README.md"
          backHref="/projects/project-1/files"
        />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '标题' })).toBeVisible()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    const editor = await screen.findByRole('textbox', { name: '编辑 README.md' })
    fireEvent.change(editor, { target: { value: '# 新标题\n' } })
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }))
    await waitFor(() =>
      expect(mocks.writeFile).toHaveBeenCalledWith('project-1', 'README.md', '# 新标题\n'),
    )
  })
})
