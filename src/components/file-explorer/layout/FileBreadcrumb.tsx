import type { PropType } from 'vue';
import { computed, defineComponent } from 'vue';
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
    const themeVars = useThemeVars();

    // 处理折叠逻辑
    const displayItems = computed(() => {
      const items = props.items;
      if (items.length <= props.maxItems) {
        return { head: items, collapsed: [], tail: [] };
      }

      // 保留首尾，折叠中间
      return {
        head: [items[0]],
        collapsed: items.slice(1, items.length - 2),
        tail: items.slice(items.length - 2)
      };
    });

    // 判断是否是最后一项（所有显示项中的最后一项）
    const isLastItem = (item: BreadcrumbItem) => {
      const display = displayItems.value;
      // 如果有 tail 项，最后一项是 tail 的最后一项
      if (display.tail.length > 0) {
        return item.id === display.tail[display.tail.length - 1].id;
      }
      // 如果有折叠项，最后一项是折叠项的最后一项
      if (display.collapsed.length > 0) {
        return item.id === display.collapsed[display.collapsed.length - 1].id;
      }
      // 否则最后一项是 head 的最后一项
      return item.id === display.head[display.head.length - 1].id;
    };

    // 判断是否是当前路径对应的项
    const isCurrentItem = (item: BreadcrumbItem) => {
      return item.path === props.path;
    };

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
    );

    // 处理折叠项点击
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
                  : themeVars.value.textColor2
              }}
              onMouseenter={(e: MouseEvent) => {
                if (!isCurrentItem(displayItems.value.head[0])) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = themeVars.value.hoverColor;
                }
              }}
              onMouseleave={(e: MouseEvent) => {
                if (!isCurrentItem(displayItems.value.head[0])) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }
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

          {/* 分隔符 - 只在不是最后一项时显示 */}
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
          {displayItems.value.head.slice(1).map((item, index) => {
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
                      color: isCurrent ? themeVars.value.primaryColor : themeVars.value.textColor2
                    }}
                    onMouseenter={(e: MouseEvent) => {
                      if (!isCurrent) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = themeVars.value.hoverColor;
                      }
                    }}
                    onMouseleave={(e: MouseEvent) => {
                      if (!isCurrent) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }
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
                {/* 分隔符 - 只在不是最后一项时显示 */}
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
                <NDropdown options={collapsedOptions.value} onSelect={handleCollapsedSelect} placement="bottom-start">
                  <div
                    class="cursor-pointer rounded px-2 py-1 transition-colors"
                    style={{
                      color: themeVars.value.textColor3
                    }}
                    onMouseenter={(e: MouseEvent) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = themeVars.value.hoverColor;
                    }}
                    onMouseleave={(e: MouseEvent) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <NIcon>
                      <EllipsisHorizontalOutline />
                    </NIcon>
                  </div>
                </NDropdown>
              </NBreadcrumbItem>
              {/* 分隔符 - 只在 tail 有项时显示 */}
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
          {displayItems.value.tail.map((item, index) => {
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
                      color: isCurrent ? themeVars.value.primaryColor : themeVars.value.textColor2
                    }}
                    onMouseenter={(e: MouseEvent) => {
                      if (!isCurrent) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = themeVars.value.hoverColor;
                      }
                    }}
                    onMouseleave={(e: MouseEvent) => {
                      if (!isCurrent) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }
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
                {/* 分隔符 - 只在不是最后一项时显示 */}
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
