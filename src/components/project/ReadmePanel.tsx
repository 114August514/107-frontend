import { BookIcon, FileCodeIcon } from '@primer/octicons-react'
import { IconButton } from '@primer/react'
import { Link as RouterLink } from 'react-router-dom'

import 'github-markdown-css/github-markdown-light.css'
import { MarkdownPreview } from './MarkdownPreview'
import styles from './ReadmePanel.module.css'

interface Props {
  content: string
  fileHref: string
}

export function ReadmePanel({ content, fileHref }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="readme-title">
      <header className={styles.header}>
        <div className={styles.title}>
          <BookIcon size={16} aria-hidden />
          <span id="readme-title">README.md</span>
        </div>
        <IconButton
          as={RouterLink}
          to={fileHref}
          icon={FileCodeIcon}
          variant="invisible"
          size="small"
          aria-label="查看 README.md 文件"
        />
      </header>
      <article className={`markdown-body ${styles.body}`}>
        <MarkdownPreview content={content} />
      </article>
    </section>
  )
}
