import { onMounted, onBeforeUnmount, Ref } from 'vue'

export type ShortcutHandler = (event: KeyboardEvent) => void
export type ShortcutMap = Record<string, ShortcutHandler>

/**
 * useKeyboardShortcuts
 * @param shortcuts 快捷键映射，键名用 `Ctrl+S`、`Shift+Delete` 等格式
 * @param target 可选，绑定的 DOM 元素，默认为 document
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  target?: Ref<HTMLElement | null>
) {
  const handler = (event: KeyboardEvent) => {
    const keys: string[] = []

    if (event.ctrlKey) keys.push('Ctrl')
    if (event.shiftKey) keys.push('Shift')
    if (event.altKey) keys.push('Alt')
    if (event.metaKey) keys.push('Meta')

    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
    keys.push(key)

    const keyStr = keys.join('+')

    if (shortcuts[keyStr]) {
      shortcuts[keyStr](event)
      event.preventDefault()
    }
  }
  const wrappedHandler: EventListener = (e) => handler(e as KeyboardEvent)

  onMounted(() => {
    const el = target?.value || document
    console.log('el', el)
    el.addEventListener('keydown', wrappedHandler)
  })

  onBeforeUnmount(() => {
    const el = target?.value || document
    el.removeEventListener('keydown', wrappedHandler)
  })
}
