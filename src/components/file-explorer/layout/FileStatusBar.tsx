import { defineComponent, PropType, computed } from 'vue'
import { NIcon, NProgress, useThemeVars } from 'naive-ui'
import { Folder, File, Check } from '@vicons/tabler'
import { FileItem } from '../types/file-explorer'

export default defineComponent({
  name: 'FileStatusBar',
  props: {
    // 总项数
    totalItems: {
      type: Number,
      required: true
    },

    // 文件夹数量
    folderCount: {
      type: Number,
      required: true
    },

    // 文件数量
    fileCount: {
      type: Number,
      required: true
    },

    // 选中的项
    selectedItems: {
      type: Array as PropType<FileItem[]>,
      default: () => []
    },

    // 总文件大小
    totalSize: {
      type: Number,
      default: 0
    },

    // 选中文件大小
    selectedSize: {
      type: Number,
      default: 0
    },

    // 加载状态
    loading: {
      type: Boolean,
      default: false
    },

    // 操作进度（0-100）
    operationProgress: {
      type: Number,
      default: 0
    },

    // 操作提示文本
    operationText: {
      type: String,
      default: ''
    },

    // 存储信息
    storageUsed: {
      type: Number,
      default: 0
    },
    storageTotal: {
      type: Number,
      default: 0
    },

    // 是否显示存储信息
    showStorage: {
      type: Boolean,
      default: false
    }
  },

  setup(props) {
    const themeVars = useThemeVars()

    // 格式化文件大小
    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      const k = 1024
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`
    }

    // 存储使用百分比
    const storagePercentage = computed(() => {
      if (props.storageTotal === 0) return 0
      return Math.round((props.storageUsed / props.storageTotal) * 100)
    })

    // 选中信息文本
    const selectionInfo = computed(() => {
      const count = props.selectedItems.length
      if (count === 0) return ''

      const size = formatSize(props.selectedSize)
      return `已选中 ${count} 项 (${size})`
    })

    return () => (
      <div
        class="flex items-center justify-between px-4 py-2 border-b text-xs select-none"
        style={{
          backgroundColor: themeVars.value.bodyColor,
          borderColor: themeVars.value.dividerColor,
          color: themeVars.value.textColor2
        }}
      >
        {/* 左侧：项目统计 */}
        <div class="flex items-center gap-4">
          {/* 总项数 */}
          <div class="flex items-center gap-1">
            <span style={{ color: themeVars.value.textColor3 }}>共</span>
            <span class="font-medium" style={{ color: themeVars.value.textColorBase }}>
              {props.totalItems}
            </span>
            <span style={{ color: themeVars.value.textColor3 }}>项</span>
          </div>

          {/* 文件夹数 */}
          {props.folderCount > 0 && (
            <div class="flex items-center gap-1">
              <NIcon size={14} style={{ color: themeVars.value.textColor3 }}>
                <Folder />
              </NIcon>
              <span class="font-medium" style={{ color: themeVars.value.textColorBase }}>
                {props.folderCount}
              </span>
            </div>
          )}

          {/* 文件数 */}
          {props.fileCount > 0 && (
            <div class="flex items-center gap-1">
              <NIcon size={14} style={{ color: themeVars.value.textColor3 }}>
                <File />
              </NIcon>
              <span class="font-medium" style={{ color: themeVars.value.textColorBase }}>
                {props.fileCount}
              </span>
            </div>
          )}

          {/* 总大小 */}
          {props.totalSize > 0 && (
            <div class="flex items-center gap-1">
              <span style={{ color: themeVars.value.textColor3 }}>总大小:</span>
              <span class="font-medium" style={{ color: themeVars.value.textColorBase }}>
                {formatSize(props.totalSize)}
              </span>
            </div>
          )}

          {/* 分隔符 */}
          {props.selectedItems.length > 0 && (
            <div
              class="h-3 w-px"
              style={{ backgroundColor: themeVars.value.dividerColor }}
            />
          )}

          {/* 选中信息 */}
          {props.selectedItems.length > 0 && (
            <div class="flex items-center gap-1.5">
              <NIcon size={14} style={{ color: themeVars.value.primaryColor }}>
                <Check />
              </NIcon>
              <span style={{ color: themeVars.value.primaryColor }}>
                {selectionInfo.value}
              </span>
            </div>
          )}
        </div>

        {/* 中间：操作进度 */}
        {props.operationProgress > 0 && props.operationProgress < 100 && (
          <div class="flex items-center gap-2 flex-1 max-w-xs mx-4">
            <span class="text-xs whitespace-nowrap" style={{ color: themeVars.value.textColor3 }}>
              {props.operationText}
            </span>
            <NProgress
              type="line"
              percentage={props.operationProgress}
              showIndicator={false}
              height={4}
              style={{ flex: 1 }}
            />
            <span class="text-xs font-medium" style={{ color: themeVars.value.textColorBase }}>
              {props.operationProgress}%
            </span>
          </div>
        )}

        {/* 右侧：存储信息 */}
        {props.showStorage && props.storageTotal > 0 && (
          <div class="flex items-center gap-2">
            <span style={{ color: themeVars.value.textColor3 }}>存储:</span>
            <span style={{ color: themeVars.value.textColorBase }}>
              {formatSize(props.storageUsed)} / {formatSize(props.storageTotal)}
            </span>
            <div class="w-20">
              <NProgress
                type="line"
                percentage={storagePercentage.value}
                showIndicator={false}
                height={4}
                status={storagePercentage.value > 90 ? 'error' : 'success'}
              />
            </div>
            <span
              class="font-medium"
              style={{
                color:
                  storagePercentage.value > 90
                    ? themeVars.value.errorColor
                    : themeVars.value.textColorBase
              }}
            >
              {storagePercentage.value}%
            </span>
          </div>
        )}

        {/* 加载状态 */}
        {props.loading && (
          <div class="flex items-center gap-2">
            <div
              class="w-1 h-1 rounded-full animate-pulse"
              style={{ backgroundColor: themeVars.value.primaryColor }}
            />
            <span style={{ color: themeVars.value.textColor3 }}>加载中...</span>
          </div>
        )}
      </div>
    )
  }
})