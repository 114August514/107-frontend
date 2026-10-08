import CodeMirror from '@uiw/react-codemirror'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { codeExtensionForFence } from './filePreview'
import styles from './FileViewer.module.css'

interface Props {
  content: string
}

/** Markdown 按不可信内容渲染：不启用 raw HTML。渲染失败时退回纯文本。 */
export function MarkdownPreview({ content }: Props) {
  return (
    <PreviewBoundary source={content}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const source = String(children ?? '').replace(/\n$/, '')
            const declared = /language-([\w#+.-]+)/.exec(className ?? '')?.[1]
            const extension = codeExtensionForFence(declared)
            if (!className || !extension) return <code>{source}</code>
            return (
              <CodeMirror
                className={styles.codeViewer}
                value={source}
                editable={false}
                readOnly
                basicSetup={{ lineNumbers: false, foldGutter: false }}
                extensions={[extension]}
                aria-label={`${declared} 代码`}
              />
            )
          },
        }}
      >
        {content}
      </Markdown>
    </PreviewBoundary>
  )
}

class PreviewBoundary extends Component<
  { source: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.setState({ failed: true })
  }

  render() {
    if (this.state.failed) {
      return (
        <div>
          <p>这份内容无法按 Markdown 显示，下面是原文。</p>
          <pre className={styles.codeViewer}>{this.props.source}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
