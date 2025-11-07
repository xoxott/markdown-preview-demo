import { defineComponent, PropType, ref } from 'vue'
import {
  NCollapse,
  NCollapseItem,
  NIcon,
  NTree,
  NBadge,
  useThemeVars
} from 'naive-ui'
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
  prefix?: () => any
  [key: string]: any
}

export default defineComponent({
  name: 'FileSidebar',
  props: {
    quickAccessItems: {
      type: Array as PropType<QuickAccessItem[]>,
      default: () => [
        { id: 'recent', label: '最近使用', icon: Clock, path: '/recent' },
        { id: 'starred', label: '已加星标', icon: Star, path: '/starred' },
        { id: 'trash', label: '回收站', icon: Trash, path: '/trash' }
      ]
    },
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
    treeData: {
      type: Array as PropType<TreeNode[]>,
      default: () => []
    },
    currentPath: {
      type: String,
      required: true
    },
    onNavigate: {
      type: Function as PropType<(path: string) => void>,
      required: true
    },
    showTree: {
      type: Boolean,
      default: true
    },
    width: {
      type: Number,
      default: 240
    }
  },

  setup(props) {
    const themeVars = useThemeVars()
    const expandedKeys = ref(['quick-access', 'file-types', 'folders'])

    const renderQuickAccessItem = (item: QuickAccessItem) => {
      const isActive = props.currentPath === item.path
      return (
        <div
          key={item.id}
          onClick={() => props.onNavigate(item.path)}
          class={[
            'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors duration-150',
            isActive
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-gray-100 text-gray-700 dark:hover:bg-neutral-800'
          ]}
          style={{
            '--tw-bg-opacity': '1',
            color: isActive ? themeVars.value.primaryColor : themeVars.value.textColor2
          }}
        >
          <div class="flex items-center gap-2">
            <NIcon size={18}>
              <item.icon />
            </NIcon>
            <span class="truncate text-sm">{item.label}</span>
          </div>
          {item.count !== undefined && (
            <NBadge
              value={item.count}
              showZero={false}
              type="info"
              class="text-xs"
            />
          )}
        </div>
      )
    }

    const renderTreePrefix = () => (
      <NIcon size={16} color={themeVars.value.textColor3}>
        <Folder />
      </NIcon>
    )

    return () => (
      <div
        class="flex flex-col border-r h-full overflow-y-auto select-none"
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
          arrow-placement="right"
          class="p-2"
        >
          <NCollapseItem title="快速访问" name="quick-access">
            <div class="flex flex-col gap-1 mt-1">
              {props.quickAccessItems.map(renderQuickAccessItem)}
            </div>
          </NCollapseItem>

          {props.fileTypeItems.length > 0 && (
            <NCollapseItem title="文件类型" name="file-types">
              <div class="flex flex-col gap-1 mt-1">
                {props.fileTypeItems.map(renderQuickAccessItem)}
              </div>
            </NCollapseItem>
          )}

          {props.showTree && props.treeData.length > 0 && (
            <NCollapseItem title="文件夹" name="folders">
              <div class="p-1 rounded-lg bg-gray-50 dark:bg-neutral-900 mt-2">
                <NTree
                  data={props.treeData}
                  blockLine
                  expandOnClick
                  selectable
                  renderPrefix={renderTreePrefix}
                  keyField="key"
                  labelField="label"
                  childrenField="children"
                  class="text-sm"
                  onUpdateSelectedKeys={(keys: string[]) => {
                    if (keys.length > 0) props.onNavigate(keys[0])
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
