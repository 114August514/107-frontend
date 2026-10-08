import { LockIcon, PencilIcon, PlusIcon, TrashIcon } from '@primer/octicons-react'
import {
  Banner,
  Button,
  ConfirmationDialog,
  Dialog,
  FormControl,
  IconButton,
  RelativeTime,
  SegmentedControl,
  Stack,
  Textarea,
  TextInput,
  VisuallyHidden,
} from '@primer/react'
import { useRef, useState } from 'react'

import { api } from '../../api/client'
import { toAsyncError, type AsyncErrorView } from '../../api/errors'
import { can } from '../../api/types'
import type { Secret, UserGroup, Variable } from '../../api/types'
import { useAsync } from '../../api/useAsync'
import { AsyncSection } from '../common/AsyncSection'
import styles from '../project/projectSettingsPanel.module.css'

/**
 * User Group 的 Variable / Secret。
 * workspace#123 收口的是 Project Settings 的「常规 / 环境变量」，不是取消组级配置。
 * design.md 将组级配置列为 Core，所以入口放在本组设置的「环境变量」。
 * 当前 UserGroup 契约不返回 config.view / config.manage，管理按钮跟随已返回的
 * user_group.update；后端仍用 config.manage 拒绝越权写入。
 */
export function GroupConfigSection({ userGroup }: { userGroup: UserGroup }) {
  const [tab, setTab] = useState<'variables' | 'secrets'>('variables')
  return (
    <section className={styles.section} aria-labelledby="group-config-title">
      <h2 id="group-config-title" className={styles.paneTitle}>
        环境变量
      </h2>
      <p className={styles.sectionDescription}>
        本组 Project 可以复用这些配置。密码和令牌放在 Secrets，页面不会回显已保存的明文。
      </p>
      <SegmentedControl
        aria-label="环境变量类型"
        className={styles.segments}
        onChange={(index) => setTab(index === 0 ? 'variables' : 'secrets')}
      >
        <SegmentedControl.Button selected={tab === 'variables'}>Variables</SegmentedControl.Button>
        <SegmentedControl.Button selected={tab === 'secrets'}>Secrets</SegmentedControl.Button>
      </SegmentedControl>
      {tab === 'variables' ? (
        <GroupVariables userGroup={userGroup} />
      ) : (
        <GroupSecrets userGroup={userGroup} />
      )}
    </section>
  )
}

const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

function nameErrorFor(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return '请输入名称'
  if (!NAME_PATTERN.test(trimmed)) return '只能包含字母、数字和下划线，且不能以数字开头'
  return null
}

function GroupVariables({ userGroup }: { userGroup: UserGroup }) {
  const canManage = can(userGroup, 'user_group.update')
  const variables = useAsync<Variable[]>(
    () => api.listUserGroupVariables(userGroup.id),
    [userGroup.id],
  )
  const [dialog, setDialog] = useState<'create' | Variable | null>(null)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [valueError, setValueError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<AsyncErrorView | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef<HTMLTextAreaElement>(null)

  const openCreate = () => {
    setName('')
    setValue('')
    setNameError(null)
    setValueError(null)
    setSubmitError(null)
    setDialog('create')
  }
  const openEdit = (row: Variable) => {
    setName(row.name)
    setValue(row.value)
    setNameError(null)
    setValueError(null)
    setSubmitError(null)
    setDialog(row)
  }
  const close = () => {
    if (!submitting) setDialog(null)
  }
  const submit = async () => {
    const nextNameError = dialog === 'create' ? nameErrorFor(name) : null
    const nextValueError = value ? null : '请输入值'
    setNameError(nextNameError)
    setValueError(nextValueError)
    if (nextNameError || nextValueError) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.putUserGroupVariable(userGroup.id, { name: name.trim(), value })
      setDialog(null)
      variables.reload()
    } catch (error) {
      setSubmitError(toAsyncError(error as Error) ?? null)
    } finally {
      setSubmitting(false)
    }
  }
  const remove = async (target: string) => {
    await api.deleteUserGroupVariable(userGroup.id, target)
    variables.reload()
  }
  const rows = variables.data ?? []

  return (
    <div>
      {canManage && (
        <div className={styles.paneHeader}>
          <Button variant="primary" leadingVisual={PlusIcon} onClick={openCreate}>
            添加变量
          </Button>
        </div>
      )}
      <AsyncSection
        loading={variables.loading}
        error={variables.error}
        errorTitle="Variable 加载失败"
      >
        {rows.length === 0 ? (
          <p className={styles.empty}>还没有 User Group Variable。</p>
        ) : (
          <table className={styles.list} aria-label="User Group Variables">
            <thead>
              <tr>
                <th scope="col">名称</th>
                <th scope="col">值</th>
                <th scope="col">最近更新</th>
                {canManage && (
                  <th scope="col">
                    <VisuallyHidden>操作</VisuallyHidden>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.value}</td>
                  <td>
                    <RelativeTime datetime={row.updated_at} />
                  </td>
                  {canManage && (
                    <td>
                      <IconButton
                        variant="invisible"
                        icon={PencilIcon}
                        aria-label={`编辑 ${row.name}`}
                        onClick={() => openEdit(row)}
                      />
                      <IconButton
                        variant="invisible"
                        icon={TrashIcon}
                        aria-label={`删除 ${row.name}`}
                        onClick={() => setPendingDelete(row.name)}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncSection>
      {dialog && (
        <Dialog
          title={dialog === 'create' ? '添加变量' : `编辑 Variable「${dialog.name}」`}
          onClose={close}
          initialFocusRef={dialog === 'create' ? nameRef : valueRef}
          footerButtons={[
            { content: '取消', disabled: submitting, onClick: close },
            {
              content: '保存',
              buttonType: 'primary',
              disabled: submitting,
              loading: submitting,
              onClick: () => void submit(),
            },
          ]}
        >
          <Stack gap="normal">
            {submitError ? (
              <Banner variant="critical">
                <Banner.Title>{submitError.message}</Banner.Title>
              </Banner>
            ) : null}
            <FormControl required disabled={dialog !== 'create'}>
              <FormControl.Label>名称</FormControl.Label>
              <TextInput
                ref={nameRef}
                block
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              {nameError ? (
                <FormControl.Validation variant="error">{nameError}</FormControl.Validation>
              ) : null}
            </FormControl>
            <FormControl required>
              <FormControl.Label>值</FormControl.Label>
              <Textarea
                ref={valueRef}
                block
                rows={4}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              {valueError ? (
                <FormControl.Validation variant="error">{valueError}</FormControl.Validation>
              ) : null}
            </FormControl>
          </Stack>
        </Dialog>
      )}
      {pendingDelete ? (
        <ConfirmationDialog
          title={`删除 Variable「${pendingDelete}」？`}
          confirmButtonContent="删除"
          confirmButtonType="danger"
          onClose={(gesture) => {
            if (gesture === 'confirm') void remove(pendingDelete)
            setPendingDelete(null)
          }}
        >
          删除后，引用这个名称的运行方案将无法解析它。
        </ConfirmationDialog>
      ) : null}
    </div>
  )
}

function GroupSecrets({ userGroup }: { userGroup: UserGroup }) {
  const canManage = can(userGroup, 'user_group.update')
  const secrets = useAsync<Secret[]>(() => api.listUserGroupSecrets(userGroup.id), [userGroup.id])
  const [dialog, setDialog] = useState<'create' | { name: string } | null>(null)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [valueError, setValueError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<AsyncErrorView | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const openCreate = () => {
    setName('')
    setValue('')
    setNameError(null)
    setValueError(null)
    setSubmitError(null)
    setDialog('create')
  }
  const openReplace = (target: string) => {
    setName(target)
    setValue('')
    setNameError(null)
    setValueError(null)
    setSubmitError(null)
    setDialog({ name: target })
  }
  const close = () => {
    if (!submitting) setDialog(null)
  }
  const submit = async () => {
    const nextNameError = dialog === 'create' ? nameErrorFor(name) : null
    const nextValueError = value ? null : '请输入值'
    setNameError(nextNameError)
    setValueError(nextValueError)
    if (nextNameError || nextValueError) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.putUserGroupSecret(userGroup.id, { name: name.trim(), value })
      setDialog(null)
      secrets.reload()
    } catch (error) {
      setSubmitError(toAsyncError(error as Error) ?? null)
    } finally {
      setSubmitting(false)
    }
  }
  const remove = async (target: string) => {
    await api.deleteUserGroupSecret(userGroup.id, target)
    secrets.reload()
  }
  const rows = secrets.data ?? []

  return (
    <div>
      {canManage && (
        <div className={styles.paneHeader}>
          <Button variant="primary" leadingVisual={PlusIcon} onClick={openCreate}>
            添加 Secret
          </Button>
        </div>
      )}
      <AsyncSection loading={secrets.loading} error={secrets.error} errorTitle="Secret 加载失败">
        {rows.length === 0 ? (
          <p className={styles.empty}>还没有 User Group Secret。</p>
        ) : (
          <table className={styles.list} aria-label="User Group Secrets">
            <thead>
              <tr>
                <th scope="col">名称</th>
                <th scope="col">最近更新</th>
                {canManage && (
                  <th scope="col">
                    <VisuallyHidden>操作</VisuallyHidden>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <td>
                    <LockIcon aria-hidden /> {row.name}
                  </td>
                  <td>
                    <RelativeTime datetime={row.updated_at} />
                  </td>
                  {canManage && (
                    <td>
                      <IconButton
                        variant="invisible"
                        icon={PencilIcon}
                        aria-label={`替换 ${row.name}`}
                        onClick={() => openReplace(row.name)}
                      />
                      <IconButton
                        variant="invisible"
                        icon={TrashIcon}
                        aria-label={`删除 ${row.name}`}
                        onClick={() => setPendingDelete(row.name)}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncSection>
      {dialog && (
        <Dialog
          title={dialog === 'create' ? '添加 Secret' : `替换 Secret「${dialog.name}」`}
          onClose={close}
          footerButtons={[
            { content: '取消', disabled: submitting, onClick: close },
            {
              content: '保存',
              buttonType: 'primary',
              disabled: submitting,
              loading: submitting,
              onClick: () => void submit(),
            },
          ]}
        >
          <Stack gap="normal">
            {submitError ? (
              <Banner variant="critical">
                <Banner.Title>{submitError.message}</Banner.Title>
              </Banner>
            ) : null}
            <FormControl required disabled={dialog !== 'create'} id="group-secret-name">
              <FormControl.Label>名称</FormControl.Label>
              <TextInput block value={name} onChange={(event) => setName(event.target.value)} />
              {nameError ? (
                <FormControl.Validation variant="error">{nameError}</FormControl.Validation>
              ) : null}
            </FormControl>
            <FormControl required id="group-secret-value">
              <FormControl.Label>值</FormControl.Label>
              <TextInput
                block
                type="password"
                aria-label="新 Secret 值"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              <FormControl.Caption>保存后不能再查看这个值，只能替换或删除。</FormControl.Caption>
              {valueError ? (
                <FormControl.Validation variant="error">{valueError}</FormControl.Validation>
              ) : null}
            </FormControl>
          </Stack>
        </Dialog>
      )}
      {pendingDelete ? (
        <ConfirmationDialog
          title={`删除 Secret「${pendingDelete}」？`}
          confirmButtonContent="删除"
          confirmButtonType="danger"
          onClose={(gesture) => {
            if (gesture === 'confirm') void remove(pendingDelete)
            setPendingDelete(null)
          }}
        >
          已保存的值不会显示。删除后，引用这个名称的运行方案将无法解析它。
        </ConfirmationDialog>
      ) : null}
    </div>
  )
}
