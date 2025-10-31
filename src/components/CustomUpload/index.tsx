import { CloudUploadOutline } from '@vicons/ionicons5';
import { NButton, NIcon, NP, NText, useThemeVars } from 'naive-ui'
import { computed, defineComponent, ref } from 'vue'
import DragDropProcessor from './DragDropProcessor'
import FileProcessor from './FileProcessor'

export interface CustomUploadFileInfo {
  id: string
  file: File
  name: string
  fullPath?: string | null;
  size: number
  type: string
  status: 'pending' | 'uploading' | 'finished' | 'error' | 'removed'
  percentage?: number
}

export default defineComponent({
  name: 'CustomUpload',
  props: {
    multiple: {
      type: Boolean,
      default: false
    },
    accept: {
      type: String,
      default: ''
    },
    directory: {
      type: Boolean,
      default: false
    },
    directoryDnd: {
      type: Boolean,
      default: false
    },
    abstract: {
      type: Boolean,
      default: false
    },
    max: {
      type: Number,
      default: Infinity
    },
    maxSize: {
      type: Number,
      default: Infinity
    },
    disabled: {
      type: Boolean,
      default: false
    },
    batchSize: {
      type: Number,
      default: 100
    },
    processingTimeout: {
      type: Number,
      default: 20
    },
    concurrentLimit: {
      type: Number,
      default: 5
    }
  },

  emits: ['change', 'error', 'exceed'],

  setup(props, { slots, emit, expose }) {
    const fileInputRef = ref<HTMLInputElement>()
    const isDragOver = ref(false)
    const isProcessing = ref(false)
    const processedFileCount = ref(0)
    const themeVars = useThemeVars()

    // 创建文件处理器
    const fileProcessor = new FileProcessor({
      batchSize: props.batchSize,
      idleTimeout: props.processingTimeout,
      maxConcurrent: props.concurrentLimit
    })

    const dragDropProcessor = new DragDropProcessor(
      props.directory,
      props.directoryDnd
    )

    // 计算属性
    const acceptedExtensions = computed(() => {
      if (!props.accept) return []
      return props.accept.split(',').map(ext => ext.trim().toLowerCase())
    })

    const canAddMore = computed(() => {
      return props.max === Infinity || processedFileCount.value < props.max
    })

    // 文件验证器
    const fileValidator = {
      validate: (file: File) => {
        // 检查文件类型
        if (acceptedExtensions.value.length > 0) {
          const fileName = file.name.toLowerCase()
          const fileExt = '.' + fileName.split('.').pop()
          const isAccepted = acceptedExtensions.value.some(ext => {
            const normalizedExt = ext.startsWith('.') ? ext : '.' + ext
            return fileExt === normalizedExt.toLowerCase()
          })
          if (!isAccepted) {
            emit('error', {
              file,
              message: `文件类型不支持: ${file.name}`
            })
            return false
          }
        }

        // 检查文件大小
        if (props.maxSize !== Infinity && file.size > props.maxSize) {
          const formatSize = (size: number) => {
            if (size < 1024) return `${size} B`
            if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
            return `${(size / (1024 * 1024)).toFixed(2)} MB`
          }
          emit('error', {
            file,
            message: `文件大小超出限制: ${file.name} (${formatSize(file.size)} / ${formatSize(props.maxSize)})`
          })
          return false
        }

        return true
      },

      getErrorMessage: (file: File) => {
        return `文件验证失败: ${file.name}`
      }
    }

    // 批量处理文件（优化核心）
    const handleFiles = async (files: File[]) => {
      if (props.disabled || files.length === 0) return

      // 检查文件数量限制
      const remainingSlots = props.max === Infinity
        ? files.length
        : Math.max(0, props.max - processedFileCount.value)

      if (remainingSlots === 0) {
        emit('exceed', { files, max: props.max })
        return
      }

      const filesToProcess = files.slice(0, remainingSlots)
      if (filesToProcess.length < files.length) {
        emit('exceed', {
          files: files.slice(remainingSlots),
          max: props.max
        })
      }

      isProcessing.value = true
      const processedFiles: CustomUploadFileInfo[] = []

      try {
        // 使用 FileProcessor 批量处理，防止卡顿
        await fileProcessor.processFiles(
          filesToProcess,
          fileValidator,
          (uploadInfo) => {
            const fileInfo: CustomUploadFileInfo = {
              id: uploadInfo.id,
              name: uploadInfo.name,
              file: uploadInfo.file!,
              fullPath: uploadInfo.fullPath,
              size: uploadInfo.file!.size,
              type: uploadInfo.file!.type,
              status: 'pending',
              percentage: 0
            }

            processedFiles.push(fileInfo)
            processedFileCount.value++
          }
        )

        // 批量触发 change 事件
        if (processedFiles.length > 0) {
          emit('change', processedFiles)
        }
      } finally {
        isProcessing.value = false
      }
    }

    // 触发文件选择
    const triggerFileSelect = (event?: Event) => {
      if (props.disabled || !canAddMore.value) return
      event?.preventDefault()
      event?.stopPropagation()
      fileInputRef.value?.click()
    }

    // 文件选择变化
    const handleFileChange = (event: Event) => {
      const input = event.target as HTMLInputElement
      const files = input.files
      if (!files || files.length === 0) return
      handleFiles(Array.from(files))
      input.value = ''
    }

    // 拖拽处理
    const dragHandler = dragDropProcessor.createHandler((files) => {
      handleFiles(files)
    })

    const handleDragOver = (event: DragEvent) => {
      if (props.disabled || !canAddMore.value) return
      event.preventDefault()
      event.stopPropagation()
      dragHandler.onDragOver(event)
      isDragOver.value = true
    }

    const handleDragLeave = (event: DragEvent) => {
      if (props.disabled) return
      event.preventDefault()
      event.stopPropagation()
      dragHandler.onDragLeave(event)
      isDragOver.value = false
    }

    const handleDrop = async (event: DragEvent) => {
      if (props.disabled || !canAddMore.value) return
      event.preventDefault()
      event.stopPropagation()
      isDragOver.value = false
      await dragHandler.onDrop(event)
    }

    // 重置
    const reset = () => {
      processedFileCount.value = 0
    }

    expose({
      triggerFileSelect,
      reset
    })

    return () => {
      const fileInput = (
        <input
          ref={fileInputRef}
          type="file"
          multiple={props.multiple}
          accept={props.accept}
          {...(props.directory ? { webkitdirectory: true } as any : {})}
          class="hidden"
          onChange={handleFileChange}
          disabled={props.disabled || !canAddMore.value}
        />
      )
      
      if (props.abstract) {
        return (
          <div class="inline-block w-full">
            {fileInput}
            {/* 使用 div 替代 NUploadDragger，手动应用样式 */}
            <div
              class={[
                'relative rounded-md border-2 border-dashed transition-all',
                'hover:border-opacity-80',
                isDragOver.value 
                  ? 'border-primary bg-opacity-5' 
                  : 'border-gray-300 dark:border-gray-600',
                props.disabled || !canAddMore.value 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer'
              ].join(' ')}
              style={{
                borderColor: isDragOver.value ? themeVars.value.primaryColor : undefined,
                backgroundColor: isDragOver.value ? themeVars.value.primaryColor + '0d' : undefined
              }}
              onClick={triggerFileSelect}
              onDrop={handleDrop}
              onDragover={handleDragOver}
              onDragleave={handleDragLeave}
              onDragenter={(e) => e.preventDefault()}
            >
              {slots.default?.({
                isDragOver: isDragOver.value,
                isProcessing: isProcessing.value,
                canAddMore: canAddMore.value,
                fileCount: processedFileCount.value,
                maxFiles: props.max
              }) || (
                <div class="py-8 px-4 text-center">
                  <NIcon size={48} depth={3} class="mb-3">
                    <CloudUploadOutline />
                  </NIcon>
                  <NText class="block text-base">
                    点击或者拖动文件到该区域来上传
                  </NText>
                  <NP depth={3} class="mt-2 text-sm">
                    {processedFileCount.value} / {props.max === Infinity ? '无限制' : props.max}
                  </NP>
                  {isProcessing.value && (
                    <div class="mt-4 flex items-center justify-center space-x-2">
                      <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <NText type="info">处理中...</NText>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!canAddMore.value && props.max !== Infinity && (
              <NText depth={3} class="block mt-2 text-xs text-center">
                已达到最大文件数量限制 ({props.max})
              </NText>
            )}
          </div>
        )
      }
      
      return (
        <div class="inline-block">
          {fileInput}
          <NButton
            onClick={triggerFileSelect}
            disabled={props.disabled || !canAddMore.value}
            loading={isProcessing.value}
            size="small"
          >
            {slots.default?.() || '选择文件'}
          </NButton>

          {!canAddMore.value && props.max !== Infinity && (
            <NText depth={3} class="block mt-2 text-xs">
              已达到最大文件数量限制 ({props.max})
            </NText>
          )}
        </div>
      )
    }
  }
})
