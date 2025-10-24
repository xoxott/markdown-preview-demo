// CustomUpload.tsx
import { defineComponent, ref, computed, type PropType } from 'vue'
import type { UploadCustomRequestOptions, UploadFileInfo } from 'naive-ui'
import FileProcessor from './FileProcessor';
import DragDropProcessor from './DragDropProcessor';

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
    disabled: {
      type: Boolean,
      default: false
    },
    beforeUpload: {
      type: Function as PropType<(data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) => boolean | Promise<boolean>>,
      required: false
    },
    customRequest: {
      type: Function as PropType<(options: UploadCustomRequestOptions) => void>,
      required: false
    },
    showFileList: {
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
    }
  },

  emits: ['change', 'progress', 'success', 'error'],

  setup(props, { slots, emit, expose }) {
    const fileInputRef = ref<HTMLInputElement>()
    const isDragOver = ref(false)
    const isProcessing = ref(false)
    const processedFiles = ref<UploadFileInfo[]>([])

    const fileProcessor = new FileProcessor({
      batchSize: props.batchSize,
      idleTimeout: props.processingTimeout,
      maxConcurrent: 3
    })

    const dragDropProcessor = new DragDropProcessor(props.directory, props.directoryDnd)

    const acceptedExtensions = computed(() => {
      if (!props.accept) return []
      return props.accept.split(',').map(ext => ext.trim().toLowerCase())
    })

    const isFileAccepted = (file: File): boolean => {
      if (acceptedExtensions.value.length === 0) return true
      const fileName = file.name.toLowerCase()
      const fileExt = '.' + fileName.split('.').pop()
      return acceptedExtensions.value.some(ext => {
        const normalizedExt = ext.startsWith('.') ? ext : '.' + ext
        return fileExt === normalizedExt.toLowerCase()
      })
    }

    const fileValidator = {
      validate: async (file: File) => {
        if (!isFileAccepted(file)) return false

        if (props.beforeUpload) {
          const fileInfo = fileProcessor.createUploadFileInfo(file)
          const result = await props.beforeUpload({
            file: fileInfo,
            fileList: [...processedFiles.value, fileInfo]
          })
          return result !== false
        }

        return true
      },
      getErrorMessage: (file: File) => {
        if (!isFileAccepted(file)) {
          return `文件类型不支持: ${file.name}`
        }
        return `文件验证失败: ${file.name}`
      }
    }

    const handleFiles = async (files: File[]) => {
      if (props.disabled || files.length === 0) return

      // 限制文件数量
      const limitedFiles = props.max < Infinity
        ? files.slice(0, Math.max(0, props.max - processedFiles.value.length))
        : files

      if (limitedFiles.length === 0) return

      isProcessing.value = true

      try {
        await fileProcessor.processFiles(
          limitedFiles,
          fileValidator,
          (fileInfo) => {
            processedFiles.value.push(fileInfo)

            if (props.customRequest) {
              const requestOptions: UploadCustomRequestOptions = {
                file: fileInfo,
                action: '',
                withCredentials: false,
                data: {},
                headers: {},
                onFinish: () => {
                  fileInfo.status = 'finished' as any
                  fileInfo.percentage = 100
                  emit('success', fileInfo)
                },
                onError: () => {
                  fileInfo.status = 'error' as any
                  emit('error', { file: fileInfo })
                },
                onProgress: (progress: { percent: number }) => {
                  fileInfo.percentage = progress.percent
                  emit('progress', { file: fileInfo, percent: progress.percent })
                }
              }

              setTimeout(() => props.customRequest!(requestOptions), 0)
            }

            emit('change', fileInfo)
          }
        )
      } catch (error) {
        console.error('文件处理失败:', error)
      } finally {
        isProcessing.value = false
      }
    }

    const triggerFileSelect = (event?: Event) => {
      if (props.disabled) return
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

    const dragHandler = dragDropProcessor.createHandler((files) => {
      handleFiles(files)
    })

    const handleDragOver = (event: DragEvent) => {
      if (props.disabled) return
      dragHandler.onDragOver(event)
      isDragOver.value = true
    }

    const handleDragLeave = (event: DragEvent) => {
      if (props.disabled) return
      dragHandler.onDragLeave(event)
      isDragOver.value = false
    }

    const handleDrop = async (event: DragEvent) => {
      if (props.disabled) return
      isDragOver.value = false
      await dragHandler.onDrop(event)
    }

    const clearFiles = () => {
      processedFiles.value = []
    }

    expose({
      triggerFileSelect,
      clearFiles,
      processedFiles: processedFiles.value
    })

    return () => {
      const uploadClasses = [
        'relative',
        props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      ]

      const dragAreaClasses = [
        'transition-all duration-300',
        isDragOver.value ? 'bg-blue-50 border-blue-400' : '',
        props.disabled ? 'pointer-events-none' : ''
      ]

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
            disabled={props.disabled}
          />

          {props.abstract ? (
            <div
              class={['w-full', ...dragAreaClasses]}
              onClick={triggerFileSelect}
              onDragover={handleDragOver}
              onDragleave={handleDragLeave}
              onDrop={handleDrop}
            >
              {slots.default?.()}
            </div>
          ) : (
            <div
              class={[
                'inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors',
                props.disabled ? 'bg-gray-400 hover:bg-gray-400' : ''
              ]}
              onClick={triggerFileSelect}
            >
              {slots.default?.() || '选择文件'}
            </div>
          )}

          {isProcessing.value && (
            <div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
              <div class="flex items-center space-x-2">
                <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-sm text-gray-600">处理中...</span>
              </div>
            </div>
          )}
        </div>
      )
    }
  }
})