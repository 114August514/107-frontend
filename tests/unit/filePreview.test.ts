import { describe, expect, it } from 'vitest'

import {
  codeExtensionForFence,
  codeExtensionForPath,
  previewKind,
} from '../../src/components/project/filePreview'

describe('file preview language', () => {
  it('treats markdown, known code, and unknown text differently', () => {
    expect(previewKind('docs/README.md')).toBe('markdown')
    expect(previewKind('src/train.py')).toBe('code')
    expect(previewKind('Dockerfile')).toBe('text')
    expect(previewKind('notes.xyz')).toBe('text')
  })

  it('selects a highlighter for declared fence languages and ignores unknown ones', () => {
    expect(codeExtensionForPath('main.rs')).not.toBeNull()
    expect(codeExtensionForFence('python')).not.toBeNull()
    expect(codeExtensionForFence('not-a-language')).toBeNull()
  })
})
