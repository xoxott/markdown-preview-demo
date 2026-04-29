import type { PropType } from 'vue';
import { computed, defineComponent, ref } from 'vue';
import { NBreadcrumb, NBreadcrumbItem, NDropdown, NIcon, useThemeVars } from 'naive-ui';
import { ChevronRight, Folder, Home } from '@vicons/tabler';
import { EllipsisHorizontalOutline } from '@vicons/ionicons5';

export interface BreadcrumbItem {
  id: string;
  name: string;
  path: string;
}

export default defineComponent({
  name: 'FileBreadcrumb',
  props: {
    path: {
      type: String,
      required: true
    },
    items: {
      type: Array as PropType<BreadcrumbItem[]>,
      required: true
    },
    onNavigate: {
      type: Function as PropType<(path: string) => void>,
      required: true
    },
    maxItems: {
      type: Number,
      default: 5
    }
  },

  setup(props) {
    const themeVars = useThemeVars();
    const hoveredItemId = ref<string | null>(null);

    const displayItems = computed(() => {
      const items = props.items;
      if (items.length <= props.maxItems) {
        return { head: items, collapsed: [], tail: [] };
      }
      return {
        head: [items[0]],
        collapsed: items.slice(1, items.length - 2),
        tail: items.slice(items.length - 2)
      };
    });

    const isLastItem = (item: BreadcrumbItem) => {
      const display = displayItems.value;
      if (display.tail.length > 0) {
        return item.id === display.tail[display.tail.length - 1].id;
      }
      if (display.collapsed.length > 0) {
        return item.id === display.collapsed[display.collapsed.length - 1].id;
      }
      return item.id === display.head[display.head.length - 1].id;
    };

    const isCurrentItem = (item: BreadcrumbItem) => {
      return item.path === props.path;
    };

    /** 获取面包屑项的背景色 */
    const getItemBg = (id: string, isCurrent: boolean) => {
      if (isCurrent) return 'transparent';
      if (hoveredItemId.value === id) return themeVars.value.hoverColor;
      return 'transparent';
    };

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
    );

    const handleCollapsedSelect = (key: string) => {
      const item = displayItems.value.collapsed.find(i => i.id === key);
      if (item) {
        props.onNavigate(item.path);
      }
    };

    return () => (
      <div
        class="flex items-center border-b px-4 py-2"
        style={{
          backgroundColor: themeVars.value.bodyColor,
          borderColor: themeVars.value.dividerColor
        }}
      >
        <NBreadcrumb separator="">
          {/* 首页图标 */}
          <NBreadcrumbItem>
            <div
              class={[
                'flex items-center gap-1 rounded px-2 py-1 transition-colors',
                isCurrentItem(displayItems.value.head[0]) ? '' : 'cursor-pointer'
              ]}
              style={{
                color: isCurrentItem(displayItems.value.head[0])
                  ? themeVars.value.primaryColor
                  : themeVars.value.textColor2,
                backgroundColor: getItemBg(
                  displayItems.value.head[0]?.id,
                  isCurrentItem(displayItems.value.head[0])
                )
              }}
              onMouseenter={() => {
                hoveredItemId.value = displayItems.value.head[0]?.id ?? null;
              }}
              onMouseleave={() => {
                hoveredItemId.value = null;
              }}
              onClick={() => {
                if (!isCurrentItem(displayItems.value.head[0])) {
                  props.onNavigate(displayItems.value.head[0]?.path || '/');
                }
              }}
            >
              <NIcon>
                <Home />
              </NIcon>
            </div>
          </NBreadcrumbItem>

          {/* 分隔符 */}
          {displayItems.value.head.length > 0 &&
            !isLastItem(displayItems.value.head[0]) &&
            (displayItems.value.head.length > 1 ||
              displayItems.value.collapsed.length > 0 ||
              displayItems.value.tail.length > 0) && (
              <span class="mx-1" style={{ color: themeVars.value.textColor3 }}>
                <NIcon>
                  <ChevronRight />
                </NIcon>
              </span>
            )}

          {/* 头部项（首项之后的项） */}
          {displayItems.value.head.slice(1).map(item => {
            const isCurrent = isCurrentItem(item);
            const isLast = isLastItem(item);
            return (
              <>
                <NBreadcrumbItem key={item.id}>
                  <div
                    class={[
                      'rounded px-2 py-1 text-sm transition-colors',
                      isCurrent ? 'font-medium' : 'cursor-pointer'
                    ]}
                    style={{
                      color: isCurrent ? themeVars.value.primaryColor : themeVars.value.textColor2,
                      backgroundColor: getItemBg(item.id, isCurrent)
                    }}
                    onMouseenter={() => {
                      hoveredItemId.value = item.id;
                    }}
                    onMouseleave={() => {
                      hoveredItemId.value = null;
                    }}
                    onClick={() => {
                      if (!isCurrent) {
                        props.onNavigate(item.path);
                      }
                    }}
                  >
                    {item.name}
                  </div>
                </NBreadcrumbItem>
                {!isLast && (
                  <span class="mx-1" style={{ color: themeVars.value.textColor3 }}>
                    <NIcon>
                      <ChevronRight />
                    </NIcon>
                  </span>
                )}
              </>
            );
          })}

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
                    class="cursor-pointer rounded px-2 py-1 transition-colors"
                    style={{
                      color: themeVars.value.textColor3,
                      backgroundColor:
                        hoveredItemId.value === '__collapsed__'
                          ? themeVars.value.hoverColor
                          : 'transparent'
                    }}
                    onMouseenter={() => {
                      hoveredItemId.value = '__collapsed__';
                    }}
                    onMouseleave={() => {
                      hoveredItemId.value = null;
                    }}
                  >
                    <NIcon>
                      <EllipsisHorizontalOutline />
                    </NIcon>
                  </div>
                </NDropdown>
              </NBreadcrumbItem>
              {displayItems.value.tail.length > 0 && (
                <span class="mx-1" style={{ color: themeVars.value.textColor3 }}>
                  <NIcon>
                    <ChevronRight />
                  </NIcon>
                </span>
              )}
            </>
          )}

          {/* 尾部项（最后两项） */}
          {displayItems.value.tail.map(item => {
            const isCurrent = isCurrentItem(item);
            const isLast = isLastItem(item);
            return (
              <>
                <NBreadcrumbItem key={item.id}>
                  <div
                    class={[
                      'px-2 py-1 rounded transition-colors text-sm',
                      isCurrent ? 'font-medium' : 'cursor-pointer'
                    ]}
                    style={{
                      color: isCurrent ? themeVars.value.primaryColor : themeVars.value.textColor2,
                      backgroundColor: getItemBg(item.id, isCurrent)
                    }}
                    onMouseenter={() => {
                      hoveredItemId.value = item.id;
                    }}
                    onMouseleave={() => {
                      hoveredItemId.value = null;
                    }}
                    onClick={() => {
                      if (!isCurrent) {
                        props.onNavigate(item.path);
                      }
                    }}
                  >
                    {item.name}
                  </div>
                </NBreadcrumbItem>
                {!isLast && (
                  <span class="mx-1" style={{ color: themeVars.value.textColor3 }}>
                    <NIcon>
                      <ChevronRight />
                    </NIcon>
                  </span>
                )}
              </>
            );
          })}
        </NBreadcrumb>
      </div>
    );
  }
});
