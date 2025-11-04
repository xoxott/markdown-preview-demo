import { defineComponent, PropType, computed } from 'vue'
import { NBreadcrumb, NBreadcrumbItem, NIcon, NDropdown, useThemeVars } from 'naive-ui'
import { Home, ChevronRight, Folder } from '@vicons/tabler'
import { EllipsisHorizontalOutline } from '@vicons/ionicons5'

export interface BreadcrumbItem {
  id: string
  name: string
  path: string
}

export default defineComponent({
  name: 'FileBreadcrumb',
  props: {
    // 当前路径
    path: {
      type: String,
      required: true
    },
    // 路径项数组
    items: {
      type: Array as PropType<BreadcrumbItem[]>,
      required: true
    },
    // 导航回调
    onNavigate: {
      type: Function as PropType<(path: string) => void>,
      required: true
    },
    // 最大显示项数（超过后折叠中间项）
    maxItems: {
      type: Number,
      default: 5
    }
  },

  setup(props) {
    const themeVars = useThemeVars()

    // 处理折叠逻辑
    const displayItems = computed(() => {
      const items = props.items
      if (items.length <= props.maxItems) {
        return { head: items, collapsed: [], tail: [] }
      }

      // 保留首尾，折叠中间
      return {
        head: [items[0]],
        collapsed: items.slice(1, items.length - 2),
        tail: items.slice(items.length - 2)
      }
    })

    // 折叠项的下拉菜单选项
    const collapsedOptions = computed(() =>
      displayItems.value.collapsed.map(item => ({
        label: item.name,
        key: item.id,
        icon: () => (
          <NIcon>
            <Folder />
          </NIcon>
        )
      }))
    )

    // 处理折叠项点击
    const handleCollapsedSelect = (key: string) => {
      const item = displayItems.value.collapsed.find(i => i.id === key)
      if (item) {
        props.onNavigate(item.path)
      }
    }

    return () => (
      <div
        class="flex items-center px-4 py-2 border-b"
        style={{
          backgroundColor: themeVars.value.bodyColor,
          borderColor: themeVars.value.dividerColor
        }}
      >
        <NBreadcrumb separator="">
          {/* 首页图标 */}
          <NBreadcrumbItem>
            <div
              class="flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors"
              style={{
                color: themeVars.value.textColor2
              }}
              onMouseenter={(e: MouseEvent) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  themeVars.value.hoverColor
              }}
              onMouseleave={(e: MouseEvent) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
              onClick={() => props.onNavigate(displayItems.value.head[0]?.path || '/')}
            >
              <NIcon >
                <Home />
              </NIcon>
            </div>
          </NBreadcrumbItem>

          {/* 分隔符 */}
          {displayItems.value.head.length > 0 && (
            <span class="mx-1" style={{ color: themeVars.value.textColor3 }}>
              <NIcon >
                <ChevronRight />
              </NIcon>
            </span>
          )}

          {/* 头部项（首项） */}
          {displayItems.value.head.slice(1).map((item, index) => (
            <>
              <NBreadcrumbItem key={item.id}>
                <div
                  class="px-2 py-1 rounded cursor-pointer transition-colors text-sm"
                  style={{
                    color: themeVars.value.textColor2
                  }}
                  onMouseenter={(e: MouseEvent) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      themeVars.value.hoverColor
                  }}
                  onMouseleave={(e: MouseEvent) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  }}
                  onClick={() => props.onNavigate(item.path)}
                >
                  {item.name}
                </div>
              </NBreadcrumbItem>
              <span class="mx-1" style={{ color: themeVars.value.textColor3 }}>
                <NIcon >
                  <ChevronRight />
                </NIcon>
              </span>
            </>
          ))}

          {/* 折叠项（下拉菜单） */}
          {displayItems.value.collapsed.length > 0 && (
            <>
              <NBreadcrumbItem>
                <NDropdown
                  options={collapsedOptions.value}
                  onSelect={handleCollapsedSelect}
                  placement="bottom-start"
                >
                  <div
                    class="px-2 py-1 rounded cursor-pointer transition-colors"
                    style={{
                      color: themeVars.value.textColor3
                    }}
                    onMouseenter={(e: MouseEvent) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        themeVars.value.hoverColor
                    }}
                    onMouseleave={(e: MouseEvent) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    <NIcon>
                      <EllipsisHorizontalOutline />
                    </NIcon>
                  </div>
                </NDropdown>
              </NBreadcrumbItem>
              <span class="mx-1" style={{ color: themeVars.value.textColor3 }}>
                <NIcon >
                  <ChevronRight />
                </NIcon>
              </span>
            </>
          )}

          {/* 尾部项（最后两项） */}
          {displayItems.value.tail.map((item, index) => (
            <>
              <NBreadcrumbItem key={item.id}>
                <div
                  class={[
                    'px-2 py-1 rounded cursor-pointer transition-colors text-sm',
                    index === displayItems.value.tail.length - 1 ? 'font-medium' : ''
                  ]}
                  style={{
                    color:
                      index === displayItems.value.tail.length - 1
                        ? themeVars.value.primaryColor
                        : themeVars.value.textColor2
                  }}
                  onMouseenter={(e: MouseEvent) => {
                    if (index !== displayItems.value.tail.length - 1) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        themeVars.value.hoverColor
                    }
                  }}
                  onMouseleave={(e: MouseEvent) => {
                    if (index !== displayItems.value.tail.length - 1) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                    }
                  }}
                  onClick={() => {
                    if (index !== displayItems.value.tail.length - 1) {
                      props.onNavigate(item.path)
                    }
                  }}
                >
                  {item.name}
                </div>
              </NBreadcrumbItem>
              {index < displayItems.value.tail.length - 1 && (
                <span class="mx-1" style={{ color: themeVars.value.textColor3 }}>
                  <NIcon >
                    <ChevronRight />
                  </NIcon>
                </span>
              )}
            </>
          ))}
        </NBreadcrumb>
      </div>
    )
  }
})