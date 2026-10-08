import { css } from '@codemirror/lang-css'
import { go } from '@codemirror/lang-go'
import { html } from '@codemirror/lang-html'
import { java } from '@codemirror/lang-java'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { yaml } from '@codemirror/lang-yaml'
import { cpp } from '@codemirror/lang-cpp'
import { langs } from '@uiw/codemirror-extensions-langs'

export type PreviewKind = 'markdown' | 'code' | 'text'

const extensionLanguages = {
  py: () => python(),
  js: () => javascript(),
  jsx: () => javascript({ jsx: true }),
  ts: () => javascript({ typescript: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  json: () => json(),
  md: () => markdown(),
  markdown: () => markdown(),
  c: () => cpp(),
  h: () => cpp(),
  cpp: () => cpp(),
  cc: () => cpp(),
  cxx: () => cpp(),
  hpp: () => cpp(),
  java: () => java(),
  rs: () => rust(),
  go: () => go(),
  sh: () => langs.bash(),
  bash: () => langs.bash(),
  yaml: () => yaml(),
  yml: () => yaml(),
  toml: () => langs.toml(),
  sql: () => langs.sql(),
  html: () => html(),
  htm: () => html(),
  css: () => css(),
}

const fenceLanguages: Record<string, string> = {
  python: 'py',
  py: 'py',
  javascript: 'js',
  js: 'js',
  jsx: 'jsx',
  typescript: 'ts',
  ts: 'ts',
  tsx: 'tsx',
  json: 'json',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  java: 'java',
  rust: 'rs',
  rs: 'rs',
  go: 'go',
  shell: 'sh',
  sh: 'sh',
  bash: 'bash',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sql: 'sql',
  html: 'html',
  css: 'css',
  markdown: 'md',
  md: 'md',
}

function fileName(path: string) {
  return path.split('/').at(-1)?.toLowerCase() ?? ''
}

function extensionOf(path: string) {
  const name = fileName(path)
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return ''
  return name.slice(dot + 1)
}

/** 预览形态。没有对应语法时回退纯文本，不把未知扩展名当成失败。 */
export function previewKind(path: string): PreviewKind {
  const extension = extensionOf(path)
  if (extension === 'md' || extension === 'markdown') return 'markdown'
  if (extension in extensionLanguages) return 'code'
  return 'text'
}

export function codeExtensionForPath(path: string) {
  const factory = extensionLanguages[extensionOf(path) as keyof typeof extensionLanguages]
  return factory ? factory() : null
}

export function codeExtensionForFence(language: string | undefined) {
  if (!language) return null
  const extension = fenceLanguages[language.toLowerCase()]
  const factory = extension
    ? extensionLanguages[extension as keyof typeof extensionLanguages]
    : undefined
  return factory ? factory() : null
}
