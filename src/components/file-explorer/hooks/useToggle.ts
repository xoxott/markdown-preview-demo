/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-11-07 17:33:12
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-11-07 17:33:16
 * @FilePath: \markdown-preview-demo\src\components\file-explorer\hooks\useToggle.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { ref, computed } from 'vue'

/**
 * useToggle
 * 通用布尔状态 Hook，可用于折叠、弹窗、开关控制等
 * @param initial 初始值，默认 false
 * @returns { state, toggle, open, close, set }
 */
export function useToggle(initial = false) {
  const state = ref(initial)

  const isOpen = computed(() => state.value)
  const isClosed = computed(() => !state.value)

  const toggle = () => {
    state.value = !state.value
  }

  const open = () => {
    state.value = true
  }

  const close = () => {
    state.value = false
  }

  const set = (value: boolean) => {
    state.value = value
  }

  return {
    state,
    isOpen,
    isClosed,
    toggle,
    open,
    close,
    set
  }
}
