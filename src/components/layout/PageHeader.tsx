import { Heading, Text } from '@primer/react'
import type { ReactNode } from 'react'

import styles from './PageHeader.module.css'

interface Props {
  /** 面包屑。只有一级的页面可以不传。 */
  breadcrumb?: { title: ReactNode }[]
  title: ReactNode
  /** 跟在标题右边的标签，比如空间类型、角色、Run 状态。 */
  tags?: ReactNode
  /** 标题下面一行说明。 */
  description?: ReactNode
  /** 右上角的操作按钮。 */
  actions?: ReactNode
}

/** 页面顶部。标题、说明和操作共用这一处。 */
export function PageHeader({ breadcrumb, title, tags, description, actions }: Props) {
  return (
    <header className={styles.header}>
      {breadcrumb && breadcrumb.length > 0 && (
        <ol className={styles.crumbs}>
          {breadcrumb.map((item, index) => (
            <li key={index}>{item.title}</li>
          ))}
        </ol>
      )}
      <div className={styles.row}>
        <div>
          <div className={styles.titleLine}>
            <Heading as="h1" variant="medium" className={styles.title}>
              {title}
            </Heading>
            {tags}
          </div>
          {description ? (
            <Text as="p" size="small" className={styles.description}>
              {description}
            </Text>
          ) : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </header>
  )
}
