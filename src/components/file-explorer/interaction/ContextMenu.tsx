import { defineComponent, ref, computed, watch, nextTick, PropType, CSSProperties } from 'vue'
import { NDropdown, NIcon, NDivider } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import { useEventListener } from '@vueuse/core'

export interface ContextMenuItem {
  key: string
  label: string
  icon?: any // Component
  disabled?: boolean
  show?: boolean
  children?: ContextMenuItem[]
  divider?: boolean
  shortcut?: string
  danger?: boolean
}

interface ContextMenuPosition {
  x: number
  y: number
}

export default defineComponent({
  name: 'ContextMenu',
  props: {
    /** 菜单项配置 */
    options: {
      type: Array as PropType<ContextMenuItem[]>,
      required: true
    },
    /** 触发区域选择器 */
    triggerSelector: {
      type: String,
      default: ''
    },
    /** 是否禁用 */
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['select', 'show', 'hide'],

  setup(props, { emit, slots }) {
    const showMenu = ref(false)
    const position = ref<ContextMenuPosition>({ x: 0, y: 0 })
    const contextData = ref<any>(null)
    const containerRef = ref<HTMLDivElement>()

    // 转换为 Naive UI Dropdown 格式
    const dropdownOptions = computed<DropdownOption[]>(() => {
      return props.options
        .filter(item => item.show !== false)
        .map(item => {
          if (item.divider) {
            return { type: 'divider', key: item.key } as DropdownOption
          }

          const option: DropdownOption = {
            key: item.key,
            label: item.label,
            disabled: item.disabled,
            icon: item.icon ? () => <NIcon component={item.icon} /> : undefined,
            props: {
              class: item.danger ? 'text-red-500' : ''
            }
          }

          if (item.children && item.children.length > 0) {
            option.children = item.children.map(child => ({
              key: child.key,
              label: child.label,
              disabled: child.disabled,
              icon: child.icon ? () => <NIcon component={child.icon} /> : undefined
            }))
          }

          return option
        })
    })

    // 计算菜单位置（防止溢出）
    const menuStyle = computed<CSSProperties>(() => {
      const style: CSSProperties = {
        position: 'fixed',
        left: `${position.value.x}px`,
        top: `${position.value.y}px`,
        zIndex: 9999
      }

      return style
    })

    // 调整菜单位置防止溢出
    const adjustPosition = async () => {
      await nextTick()
      
      const menuEl = document.querySelector('.n-dropdown-menu') as HTMLElement
      if (!menuEl) return

      const menuRect = menuEl.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let { x, y } = position.value

      // 右侧溢出
      if (x + menuRect.width > viewportWidth) {
        x = viewportWidth - menuRect.width - 10
      }

      // 底部溢出
      if (y + menuRect.height > viewportHeight) {
        y = viewportHeight - menuRect.height - 10
      }

      // 左侧溢出
      if (x < 0) x = 10

      // 顶部溢出
      if (y < 0) y = 10

      position.value = { x, y }
    }

    // 处理右键事件
    const handleContextMenu = (e: MouseEvent) => {
      if (props.disabled) return

      e.preventDefault()
      e.stopPropagation()

      const target = e.target as HTMLElement
      
      // 检查是否在指定触发区域内
      if (props.triggerSelector) {
        const triggerElement = target.closest(props.triggerSelector)
        if (!triggerElement) return

        // 获取触发元素的数据
        contextData.value = {
          id: (triggerElement as HTMLElement).dataset.selectableId,
          element: triggerElement,
          ...Object.fromEntries(
            Object.entries((triggerElement as HTMLElement).dataset)
          )
        }
      } else {
        contextData.value = null
      }

      position.value = { x: e.clientX, y: e.clientY }
      showMenu.value = true

      adjustPosition()
      emit('show', { position: position.value, data: contextData.value })
    }

    // 处理菜单项选择
    const handleSelect = (key: string) => {
      emit('select', key, contextData.value)
      hideMenu()
    }

    // 隐藏菜单
    const hideMenu = () => {
      showMenu.value = false
      contextData.value = null
      emit('hide')
    }

    // 点击外部关闭
    const handleClickOutside = (e: MouseEvent) => {
      if (!showMenu.value) return
      const target = e.target as HTMLElement
      const isClickInside = target.closest('.n-dropdown-menu')
      
      if (!isClickInside) {
        hideMenu()
      }
    }

    // 注册事件监听
    useEventListener(containerRef, 'contextmenu', handleContextMenu)
    useEventListener(document, 'click', handleClickOutside)
    useEventListener(document, 'contextmenu', (e) => {
      // 如果右键点击在外部，关闭菜单
      if (showMenu.value) {
        const target = e.target as HTMLElement
        if (!containerRef.value?.contains(target)) {
          hideMenu()
        }
      }
    })

    // Esc 键关闭
    useEventListener(document, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMenu.value) {
        hideMenu()
      }
    })

    // 监听菜单显示状态，调整位置
    watch(showMenu, (show) => {
      if (show) {
        adjustPosition()
      }
    })

    return () => (
      <div ref={containerRef}>
        {slots.default?.()}
        {showMenu.value && (
          <div style={menuStyle.value}>
            <NDropdown
              show={showMenu.value}
              options={dropdownOptions.value}
              placement="bottom-start"
              onSelect={handleSelect}
              onClickoutside={hideMenu}
            >
              <div></div>
            </NDropdown>
          </div>
         )}
        <style>{`
          /* 快捷键样式 */
          .context-menu-shortcut {
            margin-left: auto;
            padding-left: 32px;
            opacity: 0.6;
            font-size: 12px;
          }

          /* 危险操作样式 */
          .n-dropdown-option.text-red-500 {
            color: var(--n-color-error, #d03050) !important;
          }

          .n-dropdown-option.text-red-500:hover {
            background-color: color-mix(in srgb, var(--n-color-error, #d03050) 10%, transparent) !important;
          }
        `}</style>
      </div>
    )
  }
})