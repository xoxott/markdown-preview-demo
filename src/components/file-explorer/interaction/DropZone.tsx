/**
 * @file DropZone.vue
 * @description
 * 通用文件拖拽上传区域组件（支持文件、文件夹拖拽、禁用态、加载态、放置提示动画等）
 * 
 * 功能特性：
 * - 支持文件和文件夹拖拽；
 * - 拖拽进入/离开/放下时触发事件；
 * - 根据状态动态变更样式（可放置、禁止放置、禁用、加载）；
 * - 可配置为文件夹拖拽目标（asFolderZone）；
 * - 支持自定义提示文本与插槽内容；
 * - 内置 Naive UI 的图标与动画过渡效果；
 * 
 * @example
 * ```vue
 * <template>
 *   <DropZone
 *     zoneId="upload-main"
 *     targetPath="/documents"
 *     :canDrop="canUpload"
 *     :disabled="uploading"
 *     :loading="loading"
 *     @drop="handleDrop"
 *     @dragEnter="handleEnter"
 *     @dragLeave="handleLeave"
 *   />
 * </template>
 * 
 * <script setup lang="ts">
 * import DropZone from '@/components/DropZone'
 * import { ref } from 'vue'
 * 
 * const canUpload = ref(true)
 * const uploading = ref(false)
 * const loading = ref(false)
 * 
 * const handleDrop = (zoneId: string) => {
 *   console.log(`文件放下到区域: ${zoneId}`)
 * }
 * const handleEnter = (zoneId: string) => {
 *   console.log(`拖拽进入: ${zoneId}`)
 * }
 * const handleLeave = (zoneId: string) => {
 *   console.log(`拖拽离开: ${zoneId}`)
 * }
 * </script>
 * ```
 */

import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  Transition
} from 'vue'
import { NIcon, NSpin, useThemeVars } from 'naive-ui'
import {
  CloudUploadOutline,
  FolderOpenOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  ArrowDownOutline
} from '@vicons/ionicons5'

/**
 * @typedef Props
 * @property {string} zoneId 拖拽区域唯一标识符，用于区分不同放置目标
 * @property {string} targetPath 放置目标路径（例如上传路径或目标文件夹路径）
 * @property {boolean} [canDrop=true] 是否允许放置文件或文件夹
 * @property {boolean} [isOver=false] 父组件传入的"正在被拖拽悬停"的外部状态
 * @property {boolean} [disabled=false] 是否禁用该放置区
 * @property {boolean} [asFolderZone=false] 是否作为文件夹模式（在文件夹卡片内使用）
 * @property {string} [hint] 自定义提示文本（优先级最高）
 * @property {boolean} [showUploadHint=true] 是否显示底部"支持拖拽文件和文件夹"的辅助提示
 * @property {boolean} [loading=false] 是否显示加载状态（显示 NSpin）
 */
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
  /**
   * @emits dragEnter (zoneId: string) - 当拖拽进入该区域时触发
   * @emits dragLeave (zoneId: string) - 当拖拽离开该区域时触发
   * @emits drop (zoneId: string) - 当文件被放置到该区域时触发
   */
  emits: ['dragEnter', 'dragLeave', 'drop'],

  setup(props, { emit, slots }) {
    const themeVars = useThemeVars()
    /** 当前区域是否处于激活状态（存在拖拽操作） */
    const isActive = ref(false)
    /** 当前区域是否有拖拽悬停 */
    const isDragOver = ref(false)
    /** 内部计数器，用于修正多层 dragenter/dragleave 嵌套事件 */
    const dropCounter = ref(0)

    /**
     * 是否允许放置文件（综合判断 disabled、canDrop、isOver 状态）
     */
    const canAcceptDrop = computed(() => {
      return !props.disabled && props.canDrop && (props.isOver || isDragOver.value)
    })

    /**
     * 根据不同状态动态生成样式类名
     */
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
        classes.push('border-red-500 bg-red-50 dark:bg-red-900/20', 'ring-2 ring-red-500/30')
      } else if (isActive.value) {
        classes.push('border-gray-400 dark:border-gray-500')
      } else {
        classes.push('border-gray-300 dark:border-gray-600')
      }

      return classes
    })

    /**
     * 根据当前状态动态切换图标
     */
    const iconComponent = computed(() => {
      if (props.loading) return null
      if (canAcceptDrop.value) return CheckmarkCircleOutline
      if (props.isOver && !props.canDrop) return CloseCircleOutline
      if (props.asFolderZone) return FolderOpenOutline
      return CloudUploadOutline
    })

    /**
     * 图标颜色
     */
    const iconColor = computed(() => {
      if (canAcceptDrop.value) return 'text-blue-500'
      if (props.isOver && !props.canDrop) return 'text-red-500'
      return 'text-gray-400 dark:text-gray-500'
    })

    /**
     * 提示文本逻辑
     */
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

    /** 拖拽进入事件 */
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

    /** 拖拽悬停事件（控制 dropEffect） */
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

    /** 拖拽离开事件 */
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

    /** 放置事件 */
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (props.disabled || !props.canDrop) return

      dropCounter.value = 0
      isDragOver.value = false
      emit('drop', props.zoneId)
    }

    /**
     * 监听外部 isOver 状态（重置内部状态）
     */
    watch(
      () => props.isOver,
      newValue => {
        if (!newValue) {
          dropCounter.value = 0
          isDragOver.value = false
        }
      }
    )

    /** 全局拖拽开始事件（用于整体激活边框） */
    const handleGlobalDragStart = () => {
      isActive.value = true
    }

    /** 全局拖拽结束事件（重置状态） */
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

    return () => {
      const dragState = {
        isActive: isActive.value,
        isDragOver: isDragOver.value,
        canAcceptDrop: canAcceptDrop.value,
        disabled: props.disabled,
        loading: props.loading,
        hintText: hintText.value,
      }
      return (
        <div
          class={[
            'transition-all duration-200 ease-out',
            props.asFolderZone ? 'contents' : 'relative border-2 border-dashed p-8',
            !props.asFolderZone && zoneClasses.value
          ]}
          onDragenter={handleDragEnter}
          onDragover={handleDragOver}
          onDragleave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* 文件夹模式插槽（内部区域） */}
          {props.asFolderZone ? slots.default?.(dragState) : (
            <div class="relative">
              {/* 独立拖拽区域 */}
              <div class="flex flex-col items-center justify-center gap-4 text-center">
                {/* 图标部分 */}
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

                  {/* 箭头动画提示 */}
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
          )}

        </div>
      )
    }
  }
})