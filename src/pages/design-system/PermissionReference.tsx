import { FileDirectoryIcon, GearIcon, PlayIcon, PulseIcon } from '@primer/octicons-react'
import { Banner, Stack, UnderlineNav } from '@primer/react'
import { Card } from '@primer/react/experimental'

import type { Project } from '../../api/types'
import { appShellCopy } from '../../components/layout/copy'
import { projectShowsRuns, projectShowsSettings } from '../../components/project/projectSurface'
import styles from './DesignSystemPage.module.css'

const sectionAnchor = '#permission-heading'

/** projectShows* 只读取 capabilities；本页不构造完整 Project。 */
function projectWith(capabilities: NonNullable<Project['capabilities']>): Project {
  return { capabilities } as Project
}

const memberProject = projectWith(['project.view', 'run.view', 'project.update'])
const publicReaderProject = projectWith(['project.view'])

function Specimen({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card as="section" padding="normal" className={styles.specimen} aria-label={title}>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardDescription}>{description}</p>
        <div className={styles.specimenBody}>{children}</div>
      </div>
    </Card>
  )
}

function ProjectSectionNav({ label, project }: { label: string; project: Project }) {
  return (
    <UnderlineNav aria-label={label}>
      <UnderlineNav.Item
        href={sectionAnchor}
        aria-current="page"
        leadingVisual={<FileDirectoryIcon />}
      >
        {appShellCopy.files}
      </UnderlineNav.Item>
      {projectShowsRuns(project) ? (
        <UnderlineNav.Item href={sectionAnchor} leadingVisual={<PlayIcon />}>
          {appShellCopy.runs}
        </UnderlineNav.Item>
      ) : null}
      <UnderlineNav.Item href={sectionAnchor} leadingVisual={<PulseIcon />}>
        {appShellCopy.activity}
      </UnderlineNav.Item>
      {projectShowsSettings(project) ? (
        <UnderlineNav.Item href={sectionAnchor} leadingVisual={<GearIcon />}>
          {appShellCopy.settings}
        </UnderlineNav.Item>
      ) : null}
    </UnderlineNav>
  )
}

export function PermissionReference() {
  return (
    <Stack gap="normal">
      <Specimen
        title="隐藏入口"
        description="可见性调用 projectSurface.ts。公开读者只有 project.view，Runs 与 Settings 不渲染。"
      >
        <ProjectSectionNav label="公开读者的 Project 分区" project={publicReaderProject} />
      </Specimen>
      <Specimen
        title="保留入口"
        description="同一套判断：具备 run.view 与 project.update 时显示 Runs 与 Settings。"
      >
        <ProjectSectionNav label="有操作能力的 Project 分区" project={memberProject} />
      </Specimen>
      <Specimen
        title="说明不能完成的动作"
        description="来自 ui-copy.md 4.5。只有契约明确原因时才解释原因，不把角色名当作唯一解释。"
      >
        <Banner variant="critical">
          <Banner.Title>无法发布这个版本。</Banner.Title>
          <Banner.Description>你当前没有发布共享资源版本的权限。</Banner.Description>
        </Banner>
      </Specimen>
    </Stack>
  )
}
