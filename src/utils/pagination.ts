import type { PageOf } from '../api/types'

export interface ListPagination {
  current: number
  pageSize: number
  total: number
  onChange: (page: number) => void
  showSizeChanger: false
  hideOnSinglePage: true
  showTotal: (total: number) => string
}

/** 把后端分页信封转成列表分页。页码、总数和单页隐藏只在这里定义一次。 */
export function tablePagination<T>(
  page: PageOf<T> | undefined,
  onChange: (next: number) => void,
): ListPagination | false {
  if (!page) return false
  return {
    current: page.page,
    pageSize: page.page_size,
    total: page.total,
    onChange,
    showSizeChanger: false,
    hideOnSinglePage: true,
    showTotal: (total) => `共 ${total} 条`,
  }
}
