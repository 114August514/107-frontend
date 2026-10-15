import { can } from '../../api/types'
import type { Project } from '../../api/types'

/** 这些入口只跟随后端返回的 capability，不在前端按角色重写授权。 */
export function projectShowsRuns(project: Project | undefined) {
  return can(project, 'run.view')
}

export function projectShowsSettings(project: Project | undefined) {
  return (
    can(project, 'project.update') || can(project, 'config.view') || can(project, 'project.delete')
  )
}

export function projectShowsRunConfigurations(project: Project | undefined) {
  return can(project, 'run_configuration.manage') || can(project, 'run.submit')
}
