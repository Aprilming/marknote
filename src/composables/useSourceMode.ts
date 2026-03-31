import { ref } from 'vue'

// 全局源码模式状态
const isSourceMode = ref(false)

export function useSourceMode() {
  function toggleSourceMode() {
    isSourceMode.value = !isSourceMode.value
  }

  return {
    isSourceMode,
    toggleSourceMode,
  }
}
