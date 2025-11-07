/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-11-07 14:45:57
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-11-07 14:49:32
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\hooks\useKeyboardShortcuts.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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
    el.addEventListener('keydown', wrappedHandler)
  })

  onBeforeUnmount(() => {
    const el = target?.value || document
    el.removeEventListener('keydown', wrappedHandler)
  })
}
