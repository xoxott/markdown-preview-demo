import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  Transition
} from 'vue'
import { NIcon, NSpin } from 'naive-ui'
import {
  CloudUploadOutline,
  FolderOpenOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  ArrowDownOutline
} from '@vicons/ionicons5'

interface Props {
  zoneId: string
  targetPath: string
  canDrop?: boolean
  isOver?: boolean
  disabled?: boolean
  asFolderZone?: boolean
  hint?: string
  showUploadHint?: boolean
  loading?: boolean
}

export default defineComponent({
  name: 'DropZone',
  props: {
    zoneId: { type: String, required: true },
    targetPath: { type: String, required: true },
    canDrop: { type: Boolean, default: true },
    isOver: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    asFolderZone: { type: Boolean, default: false },
    hint: { type: String, default: '' },
    showUploadHint: { type: Boolean, default: true },
    loading: { type: Boolean, default: false }
  },
  emits: ['dragEnter', 'dragLeave', 'drop'],
  setup(props, { emit, slots }) {
    const isActive = ref(false)
    const isDragOver = ref(false)
    const dropCounter = ref(0)

    const canAcceptDrop = computed(() => {
      return !props.disabled && props.canDrop && (props.isOver || isDragOver.value)
    })

    const zoneClasses = computed(() => {
      const classes: string[] = []

      if (props.disabled) {
        classes.push('opacity-50 cursor-not-allowed')
      } else if (canAcceptDrop.value) {
        classes.push(
          'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
          'ring-2 ring-blue-500/30',
          'scale-[1.02]'
        )
      } else if (props.isOver && !props.canDrop) {
        classes.push(
          'border-red-500 bg-red-50 dark:bg-red-900/20',
          'ring-2 ring-red-500/30'
        )
      } else if (isActive.value) {
        classes.push('border-gray-400 dark:border-gray-500')
      } else {
        classes.push('border-gray-300 dark:border-gray-600')
      }

      return classes
    })

    const iconComponent = computed(() => {
      if (props.loading) return null
      if (canAcceptDrop.value) return CheckmarkCircleOutline
      if (props.isOver && !props.canDrop) return CloseCircleOutline
      if (props.asFolderZone) return FolderOpenOutline
      return CloudUploadOutline
    })

    const iconColor = computed(() => {
      if (canAcceptDrop.value) return 'text-blue-500'
      if (props.isOver && !props.canDrop) return 'text-red-500'
      return 'text-gray-400 dark:text-gray-500'
    })

    const hintText = computed(() => {
      if (props.hint) return props.hint
      if (props.loading) return '正在处理...'
      if (canAcceptDrop.value) {
        return props.asFolderZone ? '松开以移动到此文件夹' : '松开以放置文件'
      }
      if (props.isOver && !props.canDrop) {
        return '无法放置到此位置'
      }
      if (props.asFolderZone) {
        return '拖拽到此处'
      }
      return '拖拽文件或文件夹到此处'
    })

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (props.disabled) return

      dropCounter.value++
      if (dropCounter.value === 1) {
        isDragOver.value = true
        emit('dragEnter', props.zoneId)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (props.disabled) return

      if (e.dataTransfer) {
        if (props.canDrop) {
          e.dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move'
        } else {
          e.dataTransfer.dropEffect = 'none'
        }
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (props.disabled) return

      dropCounter.value--
      if (dropCounter.value === 0) {
        isDragOver.value = false
        emit('dragLeave', props.zoneId)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (props.disabled || !props.canDrop) return

      dropCounter.value = 0
      isDragOver.value = false
      emit('drop', props.zoneId)
    }

    watch(
      () => props.isOver,
      newValue => {
        if (!newValue) {
          dropCounter.value = 0
          isDragOver.value = false
        }
      }
    )

    const handleGlobalDragStart = () => {
      isActive.value = true
    }

    const handleGlobalDragEnd = () => {
      isActive.value = false
      isDragOver.value = false
      dropCounter.value = 0
    }

    onMounted(() => {
      document.addEventListener('dragstart', handleGlobalDragStart)
      document.addEventListener('dragend', handleGlobalDragEnd)
    })

    onUnmounted(() => {
      document.removeEventListener('dragstart', handleGlobalDragStart)
      document.removeEventListener('dragend', handleGlobalDragEnd)
    })

    return () => (
      <div
        class={[
          'relative transition-all duration-200 ease-out',
          'border-2 border-dashed rounded-lg',
          props.asFolderZone ? 'p-2' : 'p-8',
          zoneClasses.value
        ]}
        onDragenter={handleDragEnter}
        onDragover={handleDragOver}
        onDragleave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 文件夹模式插槽 */}
        {props.asFolderZone && slots.default?.()}

        {/* 独立放置区 */}
        {!props.asFolderZone && (
          <div class="flex flex-col items-center justify-center gap-4 text-center">
            {/* 图标 */}
            <div class="relative">
              {props.loading ? (
                <NSpin size={48} />
              ) : (
                iconComponent.value && (
                  <NIcon
                    component={iconComponent.value}
                    size={48}
                    class={iconColor.value}
                  />
                )
              )}

              {/* 动画箭头提示 */}
              <Transition
                enterActiveClass="transition-all duration-300"
                leaveActiveClass="transition-all duration-300"
                enterFromClass="opacity-0 -translate-y-2"
                leaveToClass="opacity-0 -translate-y-2"
              >
                {canAcceptDrop.value && (
                  <div class="absolute -bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <NIcon
                      component={ArrowDownOutline}
                      size={20}
                      class="text-blue-500"
                    />
                  </div>
                )}
              </Transition>
            </div>

            {/* 提示文本 */}
            <div class="space-y-1">
              <p
                class={[
                  'text-sm font-medium transition-colors',
                  canAcceptDrop.value
                    ? 'text-blue-600 dark:text-blue-400'
                    : props.isOver && !props.canDrop
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                ]}
              >
                {hintText.value}
              </p>

              {props.showUploadHint && !props.isOver && !props.loading && (
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  支持拖拽文件和文件夹
                </p>
              )}
            </div>

            {/* 自定义内容插槽 */}
            {slots.content?.()}
          </div>
        )}

        {/* 蓝色覆盖层 */}
        <Transition
          enterActiveClass="transition-opacity duration-200"
          leaveActiveClass="transition-opacity duration-200"
          enterFromClass="opacity-0"
          leaveToClass="opacity-0"
        >
          {canAcceptDrop.value && (
            <div class="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 rounded-lg pointer-events-none" />
          )}
        </Transition>

        {/* 错误覆盖层 */}
        <Transition
          enterActiveClass="transition-opacity duration-200"
          leaveActiveClass="transition-opacity duration-200"
          enterFromClass="opacity-0"
          leaveToClass="opacity-0"
        >
          {props.isOver && !props.canDrop && (
            <div class="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 rounded-lg pointer-events-none" />
          )}
        </Transition>
      </div>
    )
  }
})
