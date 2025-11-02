/*
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-02 16:51:15
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-02 16:51:34
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\types\file-explorer.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export type ViewMode = 'grid' | 'list' | 'tile' | 'detail' | 'content'
export type IconSize = 'extra-large' | 'large' | 'medium' | 'small'
export type SortField = 'name' | 'size' | 'type' | 'dateModified'
export type SortOrder = 'asc' | 'desc'

export interface FileItem {
  id: string
  name: string
  type: 'folder' | 'document' | 'image' | 'audio' | 'video' | 'file'
  size?: number
  dateModified?: Date
  dateCreated?: Date
  extension?: string
  thumbnail?: string
  content?: string // 用于内容视图预览
  path?: string
}

export interface ViewConfig {
  mode: ViewMode
  iconSize?: IconSize
  sortField: SortField
  sortOrder: SortOrder
  showHidden?: boolean
  gridColumns?: number
}

export interface SelectionState {
  selectedIds: string[]
  lastSelectedId?: string
  rangeStartId?: string
}