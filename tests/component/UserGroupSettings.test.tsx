// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/api/client'
import type { Secret, Variable } from '../../src/api/types'
import type { UserGroup } from '../../src/api/types'
import { SettingsSection } from '../../src/components/usergroup/SettingsSection'
import { UserGroupProvider } from '../../src/components/usergroup/UserGroupHeaderNav'
import { UserGroupPage } from '../../src/pages/UserGroupPage'

const group: UserGroup = {
  id: 'grp_lab',
  name: 'Research Lab',
  description: 'Original description',
  created_by_id: 'usr_alice',
  created_at: '2026-08-17T00:00:00Z',
  role: 'owner',
  capabilities: ['user_group.view', 'user_group.update', 'member.view'],
}

function renderSettings(groupFixture: UserGroup = group, path = '/user-groups/grp_lab/settings') {
  vi.spyOn(api, 'getUserGroup').mockResolvedValue(groupFixture)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <UserGroupProvider>
        <Routes>
          <Route path="/user-groups/:userGroupId" element={<UserGroupPage />}>
            <Route path="settings" element={<SettingsSection />} />
          </Route>
        </Routes>
      </UserGroupProvider>
    </MemoryRouter>,
  )
}

describe('User Group 设置分区', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('REQ-21-16 表单以当前名称与说明初始化并提交 trim 后的值', async () => {
    const update = vi
      .spyOn(api, 'updateUserGroup')
      .mockResolvedValue({ ...group, name: 'New Lab', description: 'New description' })
    renderSettings()

    const nameInput = (await screen.findByLabelText(/名称/)) as HTMLInputElement
    expect(nameInput.value).toBe('Research Lab')

    fireEvent.change(nameInput, { target: { value: '  New Lab  ' } })
    fireEvent.change(screen.getByLabelText(/说明/), { target: { value: '  New description  ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存更改' }))

    await screen.findByText('User Group 设置已保存。')
    expect(update).toHaveBeenCalledWith('grp_lab', {
      name: 'New Lab',
      description: 'New description',
    })
  })

  it('REQ-21-18 名称为空时校验失败且不发出请求', async () => {
    const update = vi.spyOn(api, 'updateUserGroup')
    renderSettings()

    const nameInput = await screen.findByLabelText(/名称/)
    fireEvent.change(nameInput, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存更改' }))

    expect(await screen.findByText('名称不能为空')).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  it('REQ-21-19 保存失败时展示稳定错误文案且可重试', async () => {
    const update = vi
      .spyOn(api, 'updateUserGroup')
      .mockRejectedValueOnce(new Error('forbidden'))
      .mockResolvedValueOnce(group)
    renderSettings()

    await screen.findByLabelText(/名称/)
    fireEvent.click(screen.getByRole('button', { name: '保存更改' }))

    expect(await screen.findByText('保存失败。')).toBeInTheDocument()
    expect(screen.queryByText('forbidden')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '保存更改' }))
    await screen.findByText('User Group 设置已保存。')
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('REQ-21-20 Member 直达设置 URL 只看到退出入口，不渲染改名表单', async () => {
    const memberGroup: UserGroup = {
      ...group,
      role: 'member',
      capabilities: ['user_group.view', 'member.view'],
    }
    renderSettings(memberGroup)

    expect(await screen.findByRole('heading', { name: '危险操作' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '退出 User Group' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/名称/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '保存更改' })).not.toBeInTheDocument()
  })

  it('有管理权限的成员可以查看变量值并替换 Secret，已有 Secret 明文不出现', async () => {
    const managed: UserGroup = {
      ...group,
      capabilities: ['user_group.view', 'user_group.update'],
    }
    const variables: Variable[] = [
      { name: 'DATASET', value: 's3://data', updated_at: '2026-08-17T00:00:00Z' },
    ]
    const secrets: Secret[] = [{ name: 'TOKEN', updated_at: '2026-08-17T00:00:00Z' }]
    vi.spyOn(api, 'listUserGroupVariables').mockResolvedValue(variables)
    vi.spyOn(api, 'listUserGroupSecrets').mockResolvedValue(secrets)
    const replaceSecret = vi.spyOn(api, 'putUserGroupSecret').mockResolvedValue()
    const removeVariable = vi.spyOn(api, 'deleteUserGroupVariable').mockResolvedValue()
    renderSettings(managed, '/user-groups/grp_lab/settings?section=variables')

    expect(await screen.findByText('s3://data')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '删除 DATASET' }))
    fireEvent.click(await screen.findByRole('button', { name: '删除' }))
    expect(removeVariable).toHaveBeenCalledWith('grp_lab', 'DATASET')

    fireEvent.click(screen.getByRole('button', { name: 'Secrets' }))
    expect(await screen.findByText('TOKEN')).toBeVisible()
    expect(screen.queryByDisplayValue(/./)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '替换 TOKEN' }))
    fireEvent.change(screen.getByLabelText('新 Secret 值'), { target: { value: 'new-token' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByText('TOKEN')
    expect(replaceSecret).toHaveBeenCalledWith('grp_lab', { name: 'TOKEN', value: 'new-token' })
  })

  it('只有查看权限时不提供添加和删除', async () => {
    const reader: UserGroup = {
      ...group,
      role: 'member',
      capabilities: ['user_group.view', 'member.view'],
    }
    vi.spyOn(api, 'listUserGroupVariables').mockResolvedValue([
      { name: 'DATASET', value: 's3://data', updated_at: '2026-08-17T00:00:00Z' },
    ])
    renderSettings(reader, '/user-groups/grp_lab/settings?section=variables')

    expect(await screen.findByText('s3://data')).toBeVisible()
    expect(screen.queryByRole('button', { name: '添加变量' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '删除 DATASET' })).not.toBeInTheDocument()
  })

  it('加载失败时给出可理解的错误', async () => {
    vi.spyOn(api, 'listUserGroupVariables').mockRejectedValue(new Error('forbidden'))
    renderSettings(
      { ...group, capabilities: ['user_group.view', 'user_group.update'] },
      '/user-groups/grp_lab/settings?section=variables',
    )

    expect(await screen.findByText('请求失败。')).toBeVisible()
  })
})
