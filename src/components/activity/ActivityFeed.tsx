import { Text } from '@primer/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import type { Activity, ActivityPage } from '../../api/types'
import { AsyncSection } from '../common/AsyncSection'
import { RelativeTime } from '../common/Mono'
import { describeAction, describeDetail, showsTarget, targetPath } from './actions'
import styles from './ActivityList.module.css'

interface Props {
  page: ActivityPage | undefined
  loading: boolean
  error: Error | undefined
  emptyText?: string
}

/** Project 活动流。一条活动是：谁、做了什么、对什么、什么时候。 */
export function ActivityFeed({ page, loading, error, emptyText }: Props) {
  return (
    <AsyncSection
      loading={loading}
      error={error}
      empty={page?.total === 0}
      emptyText={emptyText ?? '还没有活动记录'}
    >
      <ul className={styles.list} aria-label="活动">
        {(page?.items ?? []).map((activity) => (
          <ActivityLine key={activity.id} activity={activity} />
        ))}
      </ul>
    </AsyncSection>
  )
}

function ActivityLine({ activity }: { activity: Activity }) {
  const path = targetPath(activity)
  const target: ReactNode = !showsTarget(activity) ? null : path ? (
    <Link to={path}>{activity.target_name}</Link>
  ) : (
    <Text weight="semibold">{activity.target_name}</Text>
  )
  const detail = describeDetail(activity)

  return (
    <li className={styles.item}>
      <div className={styles.action}>
        <Text weight="semibold">{activity.actor_name}</Text>{' '}
        <Text style={{ color: 'var(--fgColor-muted)' }}>{describeAction(activity.action)}</Text>{' '}
        {target}
        {detail ? <Text style={{ color: 'var(--fgColor-muted)' }}>{`（${detail}）`}</Text> : null}
      </div>
      <RelativeTime value={activity.created_at} />
    </li>
  )
}
