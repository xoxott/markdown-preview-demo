interface DragDropHandler {
  onDragOver: (event: DragEvent) => void
  onDragLeave: (event: DragEvent) => void
  onDrop: (event: DragEvent) => Promise<void>
}
/**
 * 通用文件拖拽处理类
 * 支持文件与文件夹的拖拽提取，并自动处理浏览器兼容问题。
 * 
 * @example
 * const processor = new DragDropProcessor(true, true)
 * const handler = processor.createHandler((files) => console.log(files))
 * 
 * <div v-on="handler">拖文件到这里</div>
 */
export default class DragDropProcessor {
  private readonly allowDirectory: boolean
  private readonly allowDirectoryDnd: boolean

  /**
   * @param allowDirectory 是否允许读取目录内容
   * @param allowDirectoryDnd 是否允许文件夹拖拽
   */
  constructor(allowDirectory: boolean, allowDirectoryDnd: boolean) {
    this.allowDirectory = allowDirectory
    this.allowDirectoryDnd = allowDirectoryDnd
  }

  /**
   * 创建拖拽处理事件集合
   * 可直接绑定到 DOM 或 Vue/React 组件事件上
   */
  createHandler(onFiles: (files: File[]) => void): DragDropHandler {
    return {
      /** 拖拽经过时样式提示 */
      onDragOver: (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'copy'
        }
      },

      /** 拖拽离开时 */
      onDragLeave: (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()
      },

      /** 文件或文件夹被放下时触发 */
      onDrop: async (event: DragEvent) => {
        event.preventDefault()
        event.stopPropagation()

        const items = event.dataTransfer?.items
        const files = event.dataTransfer?.files

        try {
          if (items && items.length > 0) {
            const extracted = await this.extractFiles(items)
            if (extracted.length > 0) {
              onFiles(extracted)
              return
            }
          }

          // 降级：不支持 webkitGetAsEntry 的浏览器
          if (files && files.length > 0) {
            onFiles(Array.from(files))
          }
        } catch (err) {
          console.error('文件拖拽解析失败:', err)
        }
      }
    }
  }

  /**
   * 从 DataTransferItemList 提取文件
   * 支持目录递归读取
   */
  private async extractFiles(items: DataTransferItemList): Promise<File[]> {
    const results: File[] = []
    const tasks: Promise<void>[] = []

    // 检查浏览器兼容性
    const supportEntry = !!(items[0] && (items[0] as any).webkitGetAsEntry)
    if (!supportEntry) {
      // 不支持 webkit API，直接降级
      for (const item of Array.from(items)) {
        const file = item.getAsFile()
        if (file) results.push(file)
      }
      return results
    }

    for (const item of Array.from(items)) {
      if (item.kind !== 'file') continue

      tasks.push((async () => {
        const entry = (item as any).webkitGetAsEntry?.()
        if (!entry) return

        if (entry.isDirectory && (this.allowDirectory || this.allowDirectoryDnd)) {
          const dirFiles = await this.readDirectory(entry as FileSystemDirectoryEntry)
          results.push(...dirFiles)
        } else if (entry.isFile) {
          const file = await this.getFileFromEntry(entry as FileSystemFileEntry)
          if (file) results.push(file)
        } else {
          // 最后防御：fallback
          const file = item.getAsFile()
          if (file) results.push(file)
        }
      })())
    }

    await Promise.allSettled(tasks)
    return results
  }

  /**
   * 递归读取目录下的所有文件
   * 某些浏览器会分批返回文件项，因此需持续读取
   */
  private async readDirectory(dirEntry: FileSystemDirectoryEntry): Promise<File[]> {
    const collected: File[] = []
    const reader = dirEntry.createReader()

    return new Promise((resolve) => {
      const readEntries = () => {
        reader.readEntries(async (entries) => {
          if (!entries.length) {
            resolve(collected)
            return
          }

          const tasks: Promise<void>[] = []

          for (const entry of entries) {
            if (entry.isFile) {
              tasks.push((async () => {
                const file = await this.getFileFromEntry(entry as FileSystemFileEntry)
                if (file) collected.push(file)
              })())
            } else if (entry.isDirectory) {
              tasks.push((async () => {
                const nested = await this.readDirectory(entry as FileSystemDirectoryEntry)
                collected.push(...nested)
              })())
            }
          }

          await Promise.allSettled(tasks)
          readEntries() // 继续读取下一批
        }, (error) => {
          console.error(`读取目录失败 (${dirEntry.fullPath}):`, error)
          resolve(collected)
        })
      }

      readEntries()
    })
  }

  /**
   * 从 FileSystemFileEntry 获取 File 对象
   * 同时尝试设置 webkitRelativePath 以保留目录结构信息
   */
  private getFileFromEntry(entry: FileSystemFileEntry): Promise<File | null> {
    return new Promise((resolve) => {
      entry.file(
        (file) => {
          try {
            // 部分浏览器禁止直接修改 File 对象属性
            Object.defineProperty(file, 'webkitRelativePath', {
              value: entry.fullPath.replace(/^\//, ''),
              configurable: true
            })
          } catch (err) {
            console.warn('无法设置 webkitRelativePath:', err)
          }
          resolve(file)
        },
        (error) => {
          console.error(`获取文件失败 (${entry.fullPath}):`, error)
          resolve(null)
        }
      )
    })
  }
}
