import { defineComponent, ref, computed, watch, type PropType } from 'vue'
import type { UploadCustomRequestOptions, UploadFileInfo } from 'naive-ui'
import FileProcessor from './FileProcessor'
import DragDropProcessor from './DragDropProcessor'

// 类型定义
export interface CustomUploadFileInfo extends UploadFileInfo {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'finished' | 'error' | 'removed'
  percentage: number
  url?: string
  thumbnailUrl?: string
  response?: any
  error?: Error
  retryCount?: number
  abortController?: AbortController
}

export interface UploadOptions {
  multiple?: boolean
  accept?: string
  directory?: boolean
  directoryDnd?: boolean
  abstract?: boolean
  max?: number
  maxSize?: number // 单位：字节
  disabled?: boolean
  autoUpload?: boolean
  showFileList?: boolean
  showPreview?: boolean
  batchSize?: number
  processingTimeout?: number
  maxRetries?: number
  concurrentLimit?: number
  imageCompress?: boolean
  imageCompressQuality?: number
  beforeUpload?: (data: { file: CustomUploadFileInfo; fileList: CustomUploadFileInfo[] }) => boolean | Promise<boolean>
  customRequest?: (options: UploadCustomRequestOptions) => void
  onPreview?: (file: CustomUploadFileInfo) => void
  transformFile?: (file: File) => File | Promise<File>
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
      default: Infinity // 字节
    },
    disabled: {
      type: Boolean,
      default: false
    },
    autoUpload: {
      type: Boolean,
      default: true
    },
    showFileList: {
      type: Boolean,
      default: true
    },
    showPreview: {
      type: Boolean,
      default: true
    },
    batchSize: {
      type: Number,
      default: 50
    },
    processingTimeout: {
      type: Number,
      default: 16
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    concurrentLimit: {
      type: Number,
      default: 3
    },
    imageCompress: {
      type: Boolean,
      default: false
    },
    imageCompressQuality: {
      type: Number,
      default: 0.8
    },
    beforeUpload: {
      type: Function as PropType<(data: { file: CustomUploadFileInfo; fileList: CustomUploadFileInfo[] }) => boolean | Promise<boolean>>,
      required: false
    },
    customRequest: {
      type: Function as PropType<(options: UploadCustomRequestOptions) => void>,
      required: false
    },
    onPreview: {
      type: Function as PropType<(file: CustomUploadFileInfo) => void>,
      required: false
    },
    transformFile: {
      type: Function as PropType<(file: File) => File | Promise<File>>,
      required: false
    }
  },

  emits: [
    'change', 
    'progress', 
    'success', 
    'error', 
    'remove', 
    'retry',
    'preview',
    'exceed',
    'beforeUpload',
    'update:fileList'
  ],

  setup(props, { slots, emit, expose }) {
    const fileInputRef = ref<HTMLInputElement>()
    const isDragOver = ref(false)
    const isProcessing = ref(false)
    const fileList = ref<CustomUploadFileInfo[]>([])
    const uploadQueue = ref<CustomUploadFileInfo[]>([])
    const activeUploads = ref(0)

    const fileProcessor = new FileProcessor({
      batchSize: props.batchSize,
      idleTimeout: props.processingTimeout,
      maxConcurrent: props.concurrentLimit
    })

    const dragDropProcessor = new DragDropProcessor(props.directory, props.directoryDnd)

    // 计算属性
    const acceptedExtensions = computed(() => {
      if (!props.accept) return []
      return props.accept.split(',').map(ext => ext.trim().toLowerCase())
    })

    const canAddMore = computed(() => {
      return props.max === Infinity || fileList.value.filter(f => f.status !== 'removed').length < props.max
    })

    const pendingFiles = computed(() => {
      return fileList.value.filter(f => f.status === 'pending')
    })

    const uploadingFiles = computed(() => {
      return fileList.value.filter(f => f.status === 'uploading')
    })

    // 辅助函数
    const generateFileId = (): string => {
      return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const isImageFile = (file: File): boolean => {
      return file.type.startsWith('image/')
    }

    // 文件验证
    const isFileAccepted = (file: File): boolean => {
      if (acceptedExtensions.value.length === 0) return true
      const fileName = file.name.toLowerCase()
      const fileExt = '.' + fileName.split('.').pop()
      return acceptedExtensions.value.some(ext => {
        const normalizedExt = ext.startsWith('.') ? ext : '.' + ext
        return fileExt === normalizedExt.toLowerCase()
      })
    }

    const isFileSizeValid = (file: File): boolean => {
      return props.maxSize === Infinity || file.size <= props.maxSize
    }

    // 图片压缩
    const compressImage = async (file: File): Promise<File> => {
      if (!props.imageCompress || !isImageFile(file)) return file

      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')!
            
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
            
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now()
                  })
                  resolve(compressedFile.size < file.size ? compressedFile : file)
                } else {
                  resolve(file)
                }
              },
              file.type,
              props.imageCompressQuality
            )
          }
          img.src = e.target!.result as string
        }
        reader.readAsDataURL(file)
      })
    }

    // 创建缩略图
    const createThumbnail = async (file: File): Promise<string | undefined> => {
      if (!isImageFile(file)) return undefined

      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve(e.target!.result as string)
        }
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(file)
      })
    }

    // 文件处理
    const createUploadFileInfo = async (file: File): Promise<CustomUploadFileInfo> => {
      const thumbnailUrl = await createThumbnail(file)
      
      return {
        id: generateFileId(),
        name: file.name,
        status: 'pending',
        percentage: 0,
        file: file,
        thumbnailUrl,
        type: file.type,
        fullPath: (file as any).webkitRelativePath || file.name
      } as CustomUploadFileInfo
    }

    const fileValidator = {
      validate: async (file: File) => {
        if (!isFileAccepted(file)) return false
        if (!isFileSizeValid(file)) return false

        if (props.beforeUpload) {
          const fileInfo = await createUploadFileInfo(file)
          const result = await props.beforeUpload({
            file: fileInfo,
            fileList: [...fileList.value]
          })
          return result !== false
        }

        return true
      },
      getErrorMessage: (file: File) => {
        if (!isFileAccepted(file)) {
          return `文件类型不支持: ${file.name}`
        }
        if (!isFileSizeValid(file)) {
          return `文件大小超出限制 (最大: ${formatFileSize(props.maxSize)}): ${file.name}`
        }
        return `文件验证失败: ${file.name}`
      }
    }

    // 上传管理
    const processUploadQueue = async () => {
      while (uploadQueue.value.length > 0 && activeUploads.value < props.concurrentLimit) {
        const fileInfo = uploadQueue.value.shift()
        if (fileInfo) {
          activeUploads.value++
          await uploadFile(fileInfo)
          activeUploads.value--
        }
      }
    }

    const uploadFile = async (fileInfo: CustomUploadFileInfo) => {
      if (!props.customRequest) {
        fileInfo.status = 'finished'
        fileInfo.percentage = 100
        emit('success', fileInfo)
        return
      }

      fileInfo.status = 'uploading'
      fileInfo.abortController = new AbortController()

      const requestOptions: UploadCustomRequestOptions = {
        file: fileInfo,
        action: '',
        withCredentials: false,
        data: {},
        headers: {},
        onFinish: () => {
          fileInfo.status = 'finished'
          fileInfo.percentage = 100
          emit('success', fileInfo)
          processUploadQueue()
        },
        onError: (error: Error) => {
          fileInfo.status = 'error'
          fileInfo.error = error
          emit('error', { file: fileInfo, error })
          
          // 重试逻辑
          if ((fileInfo.retryCount || 0) < props.maxRetries) {
            fileInfo.retryCount = (fileInfo.retryCount || 0) + 1
            retryUpload(fileInfo)
          }
          
          processUploadQueue()
        },
        onProgress: (progress: { percent: number }) => {
          fileInfo.percentage = progress.percent
          emit('progress', { file: fileInfo, percent: progress.percent })
        }
      }

      try {
        await props.customRequest(requestOptions)
      } catch (error) {
        requestOptions.onError!(error as Error)
      }
    }

    const retryUpload = (fileInfo: CustomUploadFileInfo) => {
      emit('retry', fileInfo)
      setTimeout(() => {
        fileInfo.status = 'pending'
        fileInfo.percentage = 0
        fileInfo.error = undefined
        uploadQueue.value.push(fileInfo)
        processUploadQueue()
      }, 1000 * (fileInfo.retryCount || 1))
    }

    const cancelUpload = (fileInfo: CustomUploadFileInfo) => {
      if (fileInfo.abortController) {
        fileInfo.abortController.abort()
      }
      fileInfo.status = 'removed'
      const index = uploadQueue.value.findIndex(f => f.id === fileInfo.id)
      if (index > -1) {
        uploadQueue.value.splice(index, 1)
      }
    }

    const removeFile = (fileInfo: CustomUploadFileInfo) => {
      cancelUpload(fileInfo)
      const index = fileList.value.findIndex(f => f.id === fileInfo.id)
      if (index > -1) {
        fileList.value.splice(index, 1)
        emit('remove', fileInfo)
        emit('update:fileList', fileList.value)
      }
    }

    const handleFiles = async (files: File[]) => {
      if (props.disabled || files.length === 0) return

      // 检查文件数量限制
      const currentCount = fileList.value.filter(f => f.status !== 'removed').length
      const remainingSlots = props.max === Infinity ? files.length : Math.max(0, props.max - currentCount)
      
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

      try {
        const processedFiles: CustomUploadFileInfo[] = []

        for (const file of filesToProcess) {
          try {
            // 文件转换
            let processedFile = file
            if (props.transformFile) {
              processedFile = await props.transformFile(file)
            } else if (props.imageCompress && isImageFile(file)) {
              processedFile = await compressImage(file)
            }

            // 验证文件
            const isValid = await fileValidator.validate(processedFile)
            if (!isValid) {
              const errorMessage = fileValidator.getErrorMessage(processedFile)
              console.error(errorMessage)
              continue
            }

            // 创建文件信息
            const fileInfo = await createUploadFileInfo(processedFile)
            fileList.value.push(fileInfo)
            processedFiles.push(fileInfo)
            
            emit('change', fileInfo)
            emit('update:fileList', fileList.value)

            // 自动上传
            if (props.autoUpload) {
              uploadQueue.value.push(fileInfo)
            }
          } catch (error) {
            console.error('处理文件失败:', file.name, error)
          }
        }

        if (props.autoUpload && uploadQueue.value.length > 0) {
          processUploadQueue()
        }
      } finally {
        isProcessing.value = false
      }
    }

    const triggerFileSelect = (event?: Event) => {
      if (props.disabled || !canAddMore.value) return
      event?.preventDefault()
      event?.stopPropagation()
      fileInputRef.value?.click()
    }

    const handleFileChange = (event: Event) => {
      const input = event.target as HTMLInputElement
      const files = input.files

      if (!files || files.length === 0) return

      handleFiles(Array.from(files))
      input.value = ''
    }

    const handlePreview = (fileInfo: CustomUploadFileInfo) => {
      if (props.onPreview) {
        props.onPreview(fileInfo)
      } else {
        emit('preview', fileInfo)
      }
    }

    // 拖拽处理
    const dragHandler = dragDropProcessor.createHandler((files) => {
      handleFiles(files)
    })

    const handleDragOver = (event: DragEvent) => {
      if (props.disabled || !canAddMore.value) return
      dragHandler.onDragOver(event)
      isDragOver.value = true
    }

    const handleDragLeave = (event: DragEvent) => {
      if (props.disabled) return
      dragHandler.onDragLeave(event)
      isDragOver.value = false
    }

    const handleDrop = async (event: DragEvent) => {
      if (props.disabled || !canAddMore.value) return
      isDragOver.value = false
      await dragHandler.onDrop(event)
    }

    // 公共方法
    const startUpload = () => {
      if (pendingFiles.value.length > 0) {
        uploadQueue.value.push(...pendingFiles.value)
        processUploadQueue()
      }
    }

    const pauseUpload = () => {
      uploadingFiles.value.forEach(file => {
        if (file.abortController) {
          file.abortController.abort()
          file.status = 'pending'
        }
      })
      uploadQueue.value = []
    }

    const clearFiles = () => {
      pauseUpload()
      fileList.value = []
      emit('update:fileList', fileList.value)
    }

    // 监听文件列表变化
    watch(() => fileList.value, (newList) => {
      emit('update:fileList', newList)
    }, { deep: true })

    expose({
      triggerFileSelect,
      clearFiles,
      startUpload,
      pauseUpload,
      removeFile,
      retryUpload,
      fileList: computed(() => fileList.value)
    })

    return () => {
      const uploadClasses = [
        'relative',
        props.disabled ? 'cursor-not-allowed opacity-50' : '',
        !canAddMore.value ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
      ]

      const dragAreaClasses = [
        'transition-all duration-300',
        isDragOver.value ? 'bg-blue-50 border-blue-400' : '',
        props.disabled || !canAddMore.value ? 'pointer-events-none' : ''
      ]

      // 文件列表渲染
      const renderFileList = () => {
        if (!props.showFileList || fileList.value.length === 0) return null

        return (
          <div class="mt-4 space-y-2">
            {fileList.value.map(file => (
              <div 
                key={file.id} 
                class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* 缩略图 */}
                {props.showPreview && file.thumbnailUrl && (
                  <img 
                    src={file.thumbnailUrl} 
                    alt={file.name}
                    class="w-12 h-12 object-cover rounded mr-3 cursor-pointer"
                    onClick={() => handlePreview(file)}
                  />
                )}

                {/* 文件信息 */}
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium truncate max-w-xs">{file.name}</span>
                    <span class="text-xs text-gray-500">{formatFileSize(file.file.size)}</span>
                  </div>

                  {/* 进度条 */}
                  {(file.status === 'uploading' || file.status === 'pending') && (
                    <div class="mt-1">
                      <div class="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          class="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${file.percentage}%` }}
                        />
                      </div>
                      <span class="text-xs text-gray-500 mt-1">
                        {file.status === 'uploading' ? `上传中 ${file.percentage}%` : '等待上传'}
                      </span>
                    </div>
                  )}

                  {/* 状态提示 */}
                  {file.status === 'finished' && (
                    <span class="text-xs text-green-600">上传成功</span>
                  )}
                  
                  {file.status === 'error' && (
                    <div class="flex items-center mt-1">
                      <span class="text-xs text-red-600">上传失败</span>
                      {file.retryCount && file.retryCount < props.maxRetries && (
                        <button 
                          class="ml-2 text-xs text-blue-600 hover:underline"
                          onClick={() => retryUpload(file)}
                        >
                          重试
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div class="ml-3">
                  {file.status === 'uploading' && (
                    <button 
                      class="text-gray-400 hover:text-red-600 transition-colors"
                      onClick={() => cancelUpload(file)}
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  
                  {file.status !== 'uploading' && (
                    <button 
                      class="text-gray-400 hover:text-red-600 transition-colors"
                      onClick={() => removeFile(file)}
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      return (
        <div class={uploadClasses}>
          <input
            ref={fileInputRef}
            type="file"
            multiple={props.multiple}
            accept={props.accept}
            webkitdirectory={props.directory}
            class="hidden"
            onChange={handleFileChange}
            disabled={props.disabled || !canAddMore.value}
          />

          {props.abstract ? (
            <div
              class={['w-full', ...dragAreaClasses]}
              onClick={triggerFileSelect}
              onDragover={handleDragOver}
              onDragleave={handleDragLeave}
              onDrop={handleDrop}
            >
              {slots.default?.({
                isDragOver: isDragOver.value,
                isProcessing: isProcessing.value,
                canAddMore: canAddMore.value,
                fileCount: fileList.value.length,
                maxFiles: props.max
              })}
            </div>
          ) : (
            <div
              class={[
                'inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md transition-colors',
                props.disabled || !canAddMore.value 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'hover:bg-blue-600 cursor-pointer'
              ]}
              onClick={triggerFileSelect}
            >
              {slots.default?.() || '选择文件'}
            </div>
          )}

          {/* 文件列表 */}
          {renderFileList()}

          {/* 加载遮罩 */}
          {isProcessing.value && (
            <div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded">
              <div class="flex items-center space-x-2">
                <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span class="text-sm text-gray-600">处理中...</span>
              </div>
            </div>
          )}

          {/* 文件数量限制提示 */}
          {!canAddMore.value && props.max !== Infinity && (
            <div class="mt-2 text-xs text-gray-500">
              已达到最大文件数量限制 ({props.max})
            </div>
          )}
        </div>
      )
    }
  }
})
