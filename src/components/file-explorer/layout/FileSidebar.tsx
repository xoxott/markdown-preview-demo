import { defineComponent, PropType, ref } from 'vue'
import { NCollapse, NCollapseItem, NIcon, NTree, useThemeVars } from 'naive-ui'
import {
  Folder,
  Clock,
  Star,
  Trash,
  FileText,
  Music,
  Video,
  Archive,
  Photo
} from '@vicons/tabler'
export interface QuickAccessItem {
  id: string
  label: string
  icon: any
  path: string
  count?: number
}

export interface TreeNode {
  key: string
  label: string
  children?: TreeNode[]
  prefix?: () => any,
  [key: string]: any
}

export default defineComponent({
  name: 'FileSidebar',
  props: {
    // 快速访问项
    quickAccessItems: {
      type: Array as PropType<QuickAccessItem[]>,
      default: () => [
        { id: 'recent', label: '最近使用', icon: Clock, path: '/recent' },
        { id: 'starred', label: '已加星标', icon: Star, path: '/starred' },
        { id: 'trash', label: '回收站', icon: Trash, path: '/trash' }
      ]
    },

    // 文件类型快捷方式
    fileTypeItems: {
      type: Array as PropType<QuickAccessItem[]>,
      default: () => [
        { id: 'documents', label: '文档', icon: FileText, path: '/type/documents' },
        { id: 'images', label: '图片', icon: Photo, path: '/type/images' },
        { id: 'music', label: '音乐', icon: Music, path: '/type/music' },
        { id: 'videos', label: '视频', icon: Video, path: '/type/videos' },
        { id: 'archives', label: '压缩包', icon: Archive, path: '/type/archives' }
      ]
    },

    // 文件树数据
    treeData: {
      type: Array as PropType<TreeNode[]>,
      default: () => []
    },

    // 当前选中路径
    currentPath: {
      type: String,
      required: true
    },

    // 导航回调
    onNavigate: {
      type: Function as PropType<(path: string) => void>,
      required: true
    },

    // 是否显示文件树
    showTree: {
      type: Boolean,
      default: true
    },

    // 宽度
    width: {
      type: Number,
      default: 240
    }
  },

  setup(props) {
    const themeVars = useThemeVars()
    const expandedKeys = ref<string[]>(['quick-access', 'file-types', 'folders'])

    // 渲染快速访问项
    const renderQuickAccessItem = (item: QuickAccessItem) => {
      const isActive = props.currentPath === item.path

      return (
        <div
          key={item.id}
          class="flex items-center justify-between px-3 py-2 mx-2 rounded cursor-pointer transition-colors select-none"
          style={{
            backgroundColor: isActive
              ? `${themeVars.value.primaryColorHover}20`
              : 'transparent',
            color: isActive ? themeVars.value.primaryColor : themeVars.value.textColor2
          }}
          onMouseenter={(e: MouseEvent) => {
            if (!isActive) {
              (e.currentTarget as HTMLElement).style.backgroundColor =
                themeVars.value.hoverColor
            }
          }}
          onMouseleave={(e: MouseEvent) => {
            if (!isActive) {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
            }
          }}
          onClick={() => props.onNavigate(item.path)}
        >
          <div class="flex items-center gap-2">
            <NIcon size={18}>
              <item.icon />
            </NIcon>
            <span class="text-sm">{item.label}</span>
          </div>
          {item.count !== undefined && (
            <span
              class="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: themeVars.value.tableHeaderColor,
                color: themeVars.value.textColor3
              }}
            >
              {item.count}
            </span>
          )}
        </div>
      )
    }

    // 树节点前缀图标
    const renderTreePrefix = ({ option }: any) => (
      <NIcon size={16}>
        <Folder />
      </NIcon>
    )

    return () => (
      <div
        class="flex flex-col h-full border-r overflow-y-auto"
        style={{
          width: `${props.width}px`,
          backgroundColor: themeVars.value.bodyColor,
          borderColor: themeVars.value.dividerColor
        }}
      >
        <NCollapse
          defaultExpandedNames={expandedKeys.value}
          accordion={false}
          displayDirective="show"
        >
          {/* 快速访问 */}
          <NCollapseItem title="快速访问" name="quick-access">
            <div class="py-1">
              {props.quickAccessItems.map(item => renderQuickAccessItem(item))}
            </div>
          </NCollapseItem>

          {/* 文件类型 */}
          {props.fileTypeItems.length > 0 && (
            <NCollapseItem title="文件类型" name="file-types">
              <div class="py-1">
                {props.fileTypeItems.map(item => renderQuickAccessItem(item))}
              </div>
            </NCollapseItem>
          )}

          {/* 文件夹树 */}
          {props.showTree && props.treeData.length > 0 && (
            <NCollapseItem title="文件夹" name="folders">
              <div class="py-1 px-2">
                <NTree
                  data={props.treeData}
                  selectable
                  blockLine
                  expandOnClick
                  renderPrefix={renderTreePrefix}
                  onUpdateSelectedKeys={(keys: string[]) => {
                    if (keys.length > 0) {
                      props.onNavigate(keys[0])
                    }
                  }}
                />
              </div>
            </NCollapseItem>
          )}
        </NCollapse>
      </div>
    )
  }
})