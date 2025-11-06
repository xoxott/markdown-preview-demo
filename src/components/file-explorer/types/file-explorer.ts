/*
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-02 16:51:15
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-05 23:08:01
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\types\file-explorer.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export type IconSize = 'extra-large' | 'large' | 'medium' | 'small'
export type SortOrder = 'asc' | 'desc'
export type ViewMode = 'grid' | 'list' | 'tile' | 'detail' | 'content'
export type GridSize = 'small' | 'medium' | 'large' | 'extra-large'
export type SortField = 'name' | 'modifiedAt' | 'type' | 'size' | 'createdAt' 
/**
 * 文件项接口
 */
export interface FileItem {
  /** 唯一标识 */
  id: string
  /** 文件名 */
  name: string
  /** 类型 */
  type: 'file' | 'folder'
  /** 文件大小（字节） */
  size?: number
  /** 完整路径 */
  path: string
  /** 文件扩展名 */
  extension?: string
  /** 修改时间 */
  modifiedAt?: Date
  /** 创建时间 */
  createdAt?: Date
  /** MIME 类型 */
  mimeType?: string
  /** 是否为隐藏文件 */
  hidden?: boolean
  /** 权限 */
  permissions?: FilePermissions
  /** 缩略图 URL */
  thumbnailUrl?: string
  /** 自定义元数据 */
  metadata?: Record<string, any>
  color?: string
}
/**
 * 文件权限
 */
export interface FilePermissions {
  /** 可读 */
  read: boolean
  /** 可写 */
  write: boolean
  /** 可执行 */
  execute: boolean
  /** 可删除 */
  delete: boolean
}

/**
 * 拖拽状态
 */
export interface DragState {
  /** 是否正在拖拽 */
  isDragging: boolean
  /** 拖拽的项目 */
  draggedItems: FileItem[]
  /** 拖拽起始位置 */
  dragStartPos: { x: number; y: number } | null
  /** 拖拽当前位置 */
  dragCurrentPos: { x: number; y: number } | null
  /** 拖拽起始元素 */
  dragStartElement?: HTMLElement | null
}

/**
 * 放置区域状态
 */
export interface DropZoneState {
  /** 是否正在悬停 */
  isOver: boolean
  /** 是否可以放置 */
  canDrop: boolean
  /** 目标路径 */
  targetPath: string
  /** 目标类型 */
  targetType?: 'folder' | 'area'
  /** 放置区域元素 */
  element?: HTMLElement | null
}

/**
 * 拖拽操作类型
 */
export type DragOperation = 'move' | 'copy' | 'link'

/**
 * 拖拽数据传输对象
 */
export interface DragTransferData {
  /** 操作类型 */
  operation: DragOperation
  /** 文件项 ID 列表 */
  items: string[]
  /** 源路径 */
  sourcePath: string
  /** 时间戳 */
  timestamp: number
  /** 自定义数据 */
  metadata?: Record<string, any>
}

/**
 * 拖拽事件钩子
 */
export interface DragDropHooks {
  /** 拖拽开始前 */
  onBeforeDragStart?: (items: FileItem[]) => boolean | Promise<boolean>
  /** 拖拽开始 */
  onDragStart?: (items: FileItem[]) => void
  /** 拖拽移动 */
  onDragMove?: (position: { x: number; y: number }) => void
  /** 拖拽结束 */
  onDragEnd?: () => void
  /** 进入放置区域 */
  onDragEnter?: (targetPath: string) => void
  /** 离开放置区域 */
  onDragLeave?: (targetPath: string) => void
  /** 放置前验证 */
  onBeforeDrop?: (items: FileItem[], targetPath: string) => boolean | Promise<boolean>
  /** 放置 */
  onDrop?: (items: FileItem[], targetPath: string) => void | Promise<void>
  /** 移动操作 */
  onMove?: (items: FileItem[], targetPath: string) => void | Promise<void>
  /** 复制操作 */
  onCopy?: (items: FileItem[], targetPath: string) => void | Promise<void>
  /** 链接操作 */
  onLink?: (items: FileItem[], targetPath: string) => void | Promise<void>
  /** 错误处理 */
  onError?: (error: Error, context: DragDropErrorContext) => void
}

/**
 * 拖拽错误上下文
 */
export interface DragDropErrorContext {
  /** 错误类型 */
  type: 'validation' | 'operation' | 'permission' | 'network'
  /** 操作 */
  operation: DragOperation
  /** 相关项目 */
  items: FileItem[]
  /** 目标路径 */
  targetPath?: string
  /** 原始错误 */
  originalError?: Error
}

/**
 * 拖拽配置选项
 */
export interface DragDropOptions {
  /** 是否允许多选 */
  allowMultiple?: boolean
  /** 接受的文件类型 */
  acceptedTypes?: Array<'file' | 'folder'>
  /** 接受的 MIME 类型 */
  acceptedMimeTypes?: string[]
  /** 最大文件大小（字节） */
  maxFileSize?: number
  /** 最大文件数量 */
  maxFiles?: number
  /** 是否启用拖拽预览 */
  enablePreview?: boolean
  /** 是否启用自动滚动 */
  enableAutoScroll?: boolean
  /** 自动滚动速度 */
  autoScrollSpeed?: number
  /** 自动滚动边缘区域大小 */
  autoScrollEdgeSize?: number
  /** 验证函数 */
  validateDrop?: (items: FileItem[], targetPath: string,targetItem?:FileItem) => boolean
  /** 是否启用拖拽到外部 */
  enableDragOut?: boolean
  /** 是否启用从外部拖入 */
  enableDragIn?: boolean
  /** 钩子函数 */
  hooks?: DragDropHooks
  /** 事件回调 */
  onDragStart?: (items: FileItem[]) => void
  onDragEnd?: () => void
  onDrop?: (items: FileItem[], targetPath: string) => Promise<void>
  onMove?: (items: FileItem[], targetPath: string) => Promise<void>
  onCopy?: (items: FileItem[], targetPath: string) => Promise<void>
}

/**
 * 放置区域配置
 */
export interface DropZoneConfig {
  /** 区域唯一标识 */
  id: string
  /** 目标路径 */
  targetPath: string
  /** 区域类型 */
  type?: 'folder' | 'area' | 'trash'
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义验证 */
  validate?: (items: FileItem[]) => boolean
  /** 自定义提示文本 */
  hint?: string
  /** 是否高亮显示 */
  highlight?: boolean
  /** 接受的文件类型 */
  accept?: Array<'file' | 'folder'>
}

/**
 * 拖拽预览配置
 */
export interface DragPreviewConfig {
  /** 最大显示项数 */
  maxItems?: number
  /** 是否显示操作类型 */
  showOperation?: boolean
  /** 是否显示文件信息 */
  showFileInfo?: boolean
  /** 是否显示缩略图 */
  showThumbnail?: boolean
  /** 预览位置偏移 */
  offset?: { x: number; y: number }
  /** 自定义类名 */
  className?: string
  /** 自定义样式 */
  style?: Record<string, string>
}

/**
 * 拖拽结果
 */
export interface DragDropResult {
  /** 是否成功 */
  success: boolean
  /** 操作类型 */
  operation: DragOperation
  /** 处理的项目 */
  items: FileItem[]
  /** 目标路径 */
  targetPath: string
  /** 错误信息 */
  error?: Error
  /** 耗时（毫秒） */
  duration?: number
}

/**
 * 文件传输进度
 */
export interface TransferProgress {
  /** 总数 */
  total: number
  /** 已完成 */
  completed: number
  /** 失败数 */
  failed: number
  /** 当前传输项 */
  current?: FileItem
  /** 进度百分比 */
  percentage: number
  /** 传输速度（字节/秒） */
  speed?: number
  /** 剩余时间（秒） */
  remainingTime?: number
}

/**
 * 拖拽上下文
 */
export interface DragDropContext {
  /** 拖拽状态 */
  dragState: DragState
  /** 放置区域映射 */
  dropZones: Map<string, DropZoneState>
  /** 当前操作类型 */
  operation: DragOperation
  /** 传输进度 */
  progress?: TransferProgress
  /** 配置选项 */
  options: DragDropOptions
}

export interface SelectionState {
  selectedIds: string[]
  lastSelectedId?: string
  rangeStartId?: string
}