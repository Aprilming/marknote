<script setup lang="ts">
import { ref, computed, watch, watchEffect, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import TiptapEditor from './TiptapEditor.vue'
import DirectoryTree from '@/components/Search/DirectoryTree.vue'
import { useNoteStore } from '@/stores/noteStore'
import { useDirectoryStore } from '@/stores/directoryStore'
import { useSettingStore } from '@/stores/settingStore'
import { useAutoSave } from '@/composables/useAutoSave'
import { useFileSystem } from '@/composables/useFileSystem'
import { useSourceMode } from '@/composables/useSourceMode'
import { useTheme } from '@/composables/useTheme'
import NoteColorPicker from '@/components/NoteColorPicker.vue'
import { createSourceTabInsertText } from './tabInsert'

const noteStore = useNoteStore()
const directoryStore = useDirectoryStore()
const settingStore = useSettingStore()

// 当前目录名称（始终显示）
const currentDirName = computed(() => {
  const id = noteStore.filterDirectoryId
  if (id === null) return t('dirTree.rootDir')
  return directoryStore.getDirectory(id)?.name ?? t('dirTree.rootDir')
})
const { writeNote } = useFileSystem()
const { isSourceMode, toggleSourceMode } = useSourceMode()

const { isDark } = useTheme()
const { t } = useI18n()

const LIGHT_COLORS = [
  { nameKey: 'color.warmYellow', value: '#fff9e6' },
  { nameKey: 'color.softPink', value: '#fce4ec' },
  { nameKey: 'color.lightPurple', value: '#f3e5f5' },
  { nameKey: 'color.skyBlue', value: '#e3f2fd' },
  { nameKey: 'color.mint', value: '#e0f2f1' },
  { nameKey: 'color.lightOrange', value: '#fff3e0' },
  { nameKey: 'color.grayBlue', value: '#e8eaf6' },
  { nameKey: 'color.lightGray', value: '#f5f5f5' },
  { nameKey: 'color.lightGreen', value: '#e8f5e9' },
  { nameKey: 'color.beige', value: '#faf8f5' },
]

const DARK_COLORS = [
  { nameKey: 'color.darkBlue', value: '#1e293b' },
  { nameKey: 'color.darkPurple', value: '#2a1a3e' },
  { nameKey: 'color.darkGreen', value: '#1a2e24' },
  { nameKey: 'color.darkRed', value: '#3d1a1a' },
  { nameKey: 'color.darkGray', value: '#1f2937' },
  { nameKey: 'color.darkCyan', value: '#1a2e2e' },
  { nameKey: 'color.darkOrange', value: '#3d2a1a' },
  { nameKey: 'color.inkBlue', value: '#0f172a' },
  { nameKey: 'color.darkPink', value: '#2e1a2a' },
  { nameKey: 'color.darkBrown', value: '#2e241a' },
]

const NOTE_COLORS = computed(() => isDark() ? DARK_COLORS : LIGHT_COLORS)

const colorPickerVisible = ref(false)

function toggleColorPicker() {
  colorPickerVisible.value = !colorPickerVisible.value
}

function handleColorSelect(color: string | undefined) {
  if (currentNote.value) {
    noteStore.updateNote(currentNote.value.id, { backgroundColor: color })
  }
}

const localContent = ref('')
const sourceTextareaRef = ref<HTMLTextAreaElement | null>(null)

// 删除动画状态
const vortexDeleting = ref(false)

function handleVortexDelete() {
  if (vortexDeleting.value) return
  const note = noteStore.currentNote
  if (!note || note.isLocked) return
  const id = note.id

  const container = document.querySelector('.editor-container') as HTMLElement | null
  if (!container) {
    noteStore.deleteNote(id)
    return
  }

  vortexDeleting.value = true
  noteStore.setDeletingNoteId(id)

  // --- 内容动画（形变 + 模糊 + 亮度，颜色交由彩虹层负责）---
  const wrapper = container.querySelector('.editor-content-wrapper') as HTMLElement | null
  if (wrapper) {
    // 确保父容器可定位子元素
    const host = wrapper.parentElement
    if (host && getComputedStyle(host).position === 'static') {
      host.style.position = 'relative'
    }

    // --- 创建彩虹漩涡轨迹层：多条环带按角度/时间滞后错开，形成涡旋轨迹 ---
    // 层数控制成本：每层都是带 mask/blur 的大元素，太多会卡顿
    const TRAIL_COUNT = 4
    const appendHost = host ?? wrapper
    const trailLayers: HTMLElement[] = []
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const layer = document.createElement('div')
      layer.className = 'vortex-rainbow'
      appendHost.appendChild(layer)
      trailLayers.push(layer)
    }

    wrapper.animate([
      // === 阶段 1: 空间撕裂 (0-6%) ===
      { transform: 'translate(0, 0) scale(1) rotate(0deg) skew(0deg)', filter: 'blur(0px) brightness(1)', offset: 0 },
      { transform: 'translate(3px, -2px) scale(1.01) rotate(0.5deg) skew(0.5deg)', filter: 'blur(0px) brightness(1.05)', offset: 0.02 },
      { transform: 'translate(-4px, 3px) scale(0.98) rotate(-0.8deg) skew(-0.5deg)', filter: 'blur(0px) brightness(1.1)', offset: 0.04 },
      { transform: 'translate(4px, 2px) scale(1.005) rotate(0.6deg) skew(0.3deg)', filter: 'blur(0px) brightness(1.15)', offset: 0.06 },
      // === 阶段 2: 马桶式涡旋 (6-76%)：围绕中心顺时针旋转并螺旋收拢 ===
      { transform: 'translate(13.2px, 4.8px) scale(0.97) rotate(20deg) skew(0.5deg)', filter: 'blur(0.5px) brightness(1.2)', offset: 0.08 },
      { transform: 'translate(14px, 24.2px) scale(0.93) rotate(60deg) skew(0.8deg)', filter: 'blur(1px) brightness(1.3)', offset: 0.12 },
      { transform: 'translate(-25.7px, 30.6px) scale(0.86) rotate(130deg) skew(1.2deg)', filter: 'blur(1.5px) brightness(1.4)', offset: 0.18 },
      { transform: 'translate(-34.5px, -28.9px) scale(0.78) rotate(220deg) skew(1.5deg)', filter: 'blur(2px) brightness(1.55)', offset: 0.26 },
      { transform: 'translate(36.4px, -21px) scale(0.68) rotate(330deg) skew(2deg)', filter: 'blur(2.5px) brightness(1.7)', offset: 0.36 },
      { transform: 'translate(0px, 35px) scale(0.56) rotate(450deg) skew(2.4deg)', filter: 'blur(3px) brightness(1.9)', offset: 0.46 },
      { transform: 'translate(-20.7px, -17.4px) scale(0.43) rotate(580deg) skew(2.8deg)', filter: 'blur(4px) brightness(2.1)', offset: 0.56 },
      { transform: 'translate(17.7px, -3.1px) scale(0.3) rotate(710deg) skew(3.2deg)', filter: 'blur(5px) brightness(2.4)', offset: 0.66 },
      { transform: 'translate(-3.8px, 10.3px) scale(0.18) rotate(830deg) skew(3.5deg)', filter: 'blur(6.5px) brightness(2.8)', offset: 0.76 },
      // === 阶段 3: 冲入下水道 (76-93%)：加速收拢进中心 ===
      { transform: 'translate(-4.7px, -1.7px) scale(0.08) rotate(920deg) skew(4deg)', filter: 'blur(8px) brightness(3.5)', offset: 0.86 },
      { transform: 'translate(0, 0) scale(0.02) rotate(980deg) skew(4deg)', filter: 'blur(12px) brightness(5)', offset: 0.93 },
      // === 阶段 4: 虚无 (93-100%) ===
      { transform: 'translate(0, 0) scale(0) rotate(980deg) skew(0deg)', filter: 'blur(15px) brightness(8)', offset: 1 },
    ], {
      duration: 1200,
      easing: 'cubic-bezier(0.45, 0.0, 0.6, 0.1)',
      fill: 'forwards',
    })

    // === 彩虹漩涡轨迹动画：各层沿螺旋轨道旋转吸入，角度/时间双滞后形成可见轨迹 ===
    const fade = (i: number) => Math.max(0.15, 1 - i * 0.12)
    const rotOffset = (i: number) => (i * 360) / TRAIL_COUNT
    const scaleBoost = (i: number) => 1 + i * 0.06
    // 轨道坐标：角度 → 圆上百分比坐标（相对元素尺寸），半径随吸入收缩成螺旋
    const orbit = (angle: number, radius: number) => {
      const rad = angle * Math.PI / 180
      return `${(Math.cos(rad) * radius).toFixed(2)}% ${(Math.sin(rad) * radius).toFixed(2)}%`
    }

    const trailAnims = trailLayers.map((layer, i) => {
      // 越靠后的轨迹层越模糊、越淡，营造纵深与残影感（仅用 GPU 友好的 blur，避免 SVG 滤镜卡顿）
      layer.style.filter = `blur(${(1.5 + i * 1.2).toFixed(1)}px) saturate(1.8)`
      const base = rotOffset(i)
      const boost = scaleBoost(i)
      const s = (v: number) => (v * boost).toFixed(3)

      return layer.animate([
        { opacity: 0,              transform: `translate(${orbit(base, 15)}) rotate(${base}deg) scale(${s(0.4)})` },
        { opacity: 0.45 * fade(i), transform: `translate(${orbit(base + 90, 13)}) rotate(${base + 90}deg) scale(${s(0.66)})` },
        { opacity: 0.8 * fade(i),  transform: `translate(${orbit(base + 200, 10)}) rotate(${base + 200}deg) scale(${s(0.9)})` },
        { opacity: fade(i),        transform: `translate(${orbit(base + 320, 7)}) rotate(${base + 320}deg) scale(${s(1.03)})` },
        { opacity: 0.75 * fade(i), transform: `translate(${orbit(base + 430, 4.5)}) rotate(${base + 430}deg) scale(${s(0.85)})` },
        { opacity: 0.4 * fade(i),  transform: `translate(${orbit(base + 530, 2.5)}) rotate(${base + 530}deg) scale(${s(0.5)})` },
        { opacity: 0.12 * fade(i), transform: `translate(${orbit(base + 610, 1)}) rotate(${base + 610}deg) scale(${s(0.2)})` },
        { opacity: 0,              transform: `translate(${orbit(base + 700, 0)}) rotate(${base + 700}deg) scale(${s(0.05)})` },
      ], {
        duration: 1100,
        delay: i * 55,
        easing: 'cubic-bezier(0.45, 0.0, 0.6, 0.1)',
        fill: 'both',
      })
    })

    // 全部轨迹层动画结束后统一清理
    Promise.allSettled(trailAnims.map(a => a.finished))
      .then(() => trailLayers.forEach(l => l.remove()))
  }

  // --- 动画结束后执行实际删除 ---
  setTimeout(() => {
    vortexDeleting.value = false
    if (noteStore.currentNoteId === id) {
      noteStore.deleteNote(id)
    } else {
      noteStore.setDeletingNoteId(null)
    }
  }, 1250)
}

// 当前笔记是否锁定
const isLocked = computed(() => currentNote.value?.isLocked ?? false)

// 切换锁定状态
function toggleLock() {
  if (currentNote.value) {
    noteStore.toggleLock(currentNote.value.id)
  }
}

// 计算当前笔记字数
const wordCount = computed(() => {
  const text = localContent.value || ''
  const count = text.trim().length
  return count
})

// get current note
const currentNote = computed(() => noteStore.currentNote)

// 导航方向由 store 统一维护（noteStore.navDirection），模板直接绑定，用于滑动过渡动画
// 追踪目录切换，用于决定垂直滑动方向
let pendingDirChange: 'up' | 'down' | null = null

watch(() => noteStore.filterDirectoryId, (newId, oldId) => {
  if (oldId === undefined || newId === oldId) return
  const ids = directoryStore.getFlattenedDirectoryIds()
  const oldIdx = ids.findIndex(id => id === oldId)
  const newIdx = ids.findIndex(id => id === newId)
  pendingDirChange = newIdx > oldIdx ? 'down' : 'up'
})

// update local content when current note changes
watch(
  () => currentNote.value?.id,
  async (newId, oldId) => {
    // 目录切换方向（up/down）：由组件根据目录位置推断并覆盖 store 方向
    if (pendingDirChange) {
      noteStore.navDirection = pendingDirChange
      pendingDirChange = null
    }
    // 其余导航（上一页/下一页/新建/删除）方向已由 store 的导航函数显式设置，
    // 模板直接绑定 noteStore.navDirection，无需在此推断（避免 watch 合并/跳过导致方向残留）

    // 如果是从源码模式切换笔记，需要先同步保存当前笔记的编辑内容
    if (isSourceMode.value && oldId && newId !== oldId) {
      // 确保 textarea 的内容完全同步到 localContent
      if (sourceTextareaRef.value) {
        // 手动同步 textarea 的值到 localContent
        localContent.value = sourceTextareaRef.value.value
      }
      // 直接调用 writeNote 同步保存，不依赖防抖机制
      await writeNote(oldId, localContent.value)
      noteStore.updateNote(oldId, { content: localContent.value })
    }
    localContent.value = currentNote.value?.content || ''
    // 切换笔记时保持源码模式状态，不强制重置
    // isSourceMode.value = false
  },
  { immediate: true }
)

// 监听源码模式切换，确保 textarea 内容同步
watch(isSourceMode, (newVal, oldVal) => {
  if (newVal) {
    // 源码模式激活时，等待 DOM 更新后聚焦
    setTimeout(() => {
      sourceTextareaRef.value?.focus()
      if (searchVisible.value && searchQuery.value) {
        updateSourceSearchState()
      }
    }, 50)
  } else if (oldVal && !newVal) {
    // 从源码模式切换到普通模式时，确保内容已同步
    // 这里不需要额外处理，因为 handleSourceInput 已经实时同步了内容
    nextTick(() => {
      if (searchVisible.value && searchQuery.value) {
        applySearchQuery(searchQuery.value)
      }
    })
  }
})


// auto-save
const { isSaving } = useAutoSave(
  () => currentNote.value?.id || null,
  () => localContent.value,
  async (id, content) => {
    await writeNote(id, content)
  },
  settingStore.settings.autoSaveInterval
)

// 追踪手势状态
let gestureFired = false
let lastDeltaX = 0

function handleWheel(e: WheelEvent) {
  // 只处理水平滑动
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) <= 5) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  // 方向翻转，视为新手势
  if (lastDeltaX !== 0 && Math.sign(e.deltaX) !== Math.sign(lastDeltaX)) {
    gestureFired = false
  }

  lastDeltaX = e.deltaX

  // 每次手势只触发一次
  if (!gestureFired) {
    gestureFired = true

    if (e.deltaX > 0) {
      noteStore.navigateNextOrCreate()
    } else {
      noteStore.navigatePrevOrCreate()
    }
  }

  // 用 cancelable 的 setTimeout 检测手势结束（无后续事件则视为结束）
  clearTimeout(wheelEndTimer)
  wheelEndTimer = setTimeout(() => {
    gestureFired = false
    lastDeltaX = 0
  }, 30) // 80ms 无新事件，视为手势结束
}

let wheelEndTimer: ReturnType<typeof setTimeout>

onMounted(() => {
  window.addEventListener('marknote:delete-note', handleVortexDelete)
  const editor = document.querySelector('.editor-container')
  if (editor) {
    editor.addEventListener('wheel', handleWheel as EventListener, { passive: false })
  }

  // 直接监听背景色变化并设置DOM样式
  watchEffect(() => {
    const color = currentNote.value?.backgroundColor
    const wrapper = document.querySelector('.editor-wrapper') as HTMLElement | null
    if (wrapper) {
      if (color) {
        wrapper.style.setProperty('--note-bg', color)
      } else {
        wrapper.style.removeProperty('--note-bg')
      }
    }
    const textarea = document.querySelector('.source-textarea') as HTMLElement | null
    if (textarea) {
      if (color) {
        textarea.style.setProperty('background', color, 'important')
      } else {
        textarea.style.removeProperty('background')
      }
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('marknote:delete-note', handleVortexDelete)
  // 在组件卸载前同步源码模式下的内容
  if (isSourceMode.value && sourceTextareaRef.value && currentNote.value) {
    // 确保 textarea 的内容同步到 localContent 和 store
    localContent.value = sourceTextareaRef.value.value
    noteStore.updateNote(currentNote.value.id, { content: sourceTextareaRef.value.value })
  }

  const editor = document.querySelector('.editor-container')
  if (editor) {
    editor.removeEventListener('wheel', handleWheel as EventListener)
  }
  clearTimeout(wheelEndTimer)
})

const editorRef = ref<InstanceType<typeof TiptapEditor> | null>(null)
const searchVisible = ref(false)
const searchQuery = ref('')
const searchMatchCount = ref(0)
const searchCurrentIndex = ref(0)
const sourceSearchMatches = ref<Array<{ start: number; end: number }>>([])
const sourceSearchCurrentIndex = ref(0)
const markdownScrollRatios = new Map<string, number>()
const sourceScrollRatios = new Map<string, number>()

function getTextareaScrollRatio() {
  const textarea = sourceTextareaRef.value
  if (!textarea) return 0
  const maxScroll = textarea.scrollHeight - textarea.clientHeight
  return maxScroll > 0 ? textarea.scrollTop / maxScroll : 0
}

function setTextareaScrollRatio(ratio: number) {
  const textarea = sourceTextareaRef.value
  if (!textarea) return
  const maxScroll = textarea.scrollHeight - textarea.clientHeight
  textarea.scrollTop = Math.max(0, Math.min(1, ratio)) * Math.max(0, maxScroll)
}

function getCurrentNoteId() {
  return currentNote.value?.id || ''
}

function saveCurrentModeScrollRatio() {
  const noteId = getCurrentNoteId()
  if (!noteId) return

  if (isSourceMode.value) {
    sourceScrollRatios.set(noteId, getTextareaScrollRatio())
  } else {
    markdownScrollRatios.set(noteId, editorRef.value?.getScrollRatio() ?? 0)
  }
}

function getSavedScrollRatio(targetSourceMode: boolean) {
  const noteId = getCurrentNoteId()
  if (!noteId) return 0

  return (targetSourceMode ? sourceScrollRatios : markdownScrollRatios).get(noteId) ?? 0
}

function restoreScrollAfterModeSwitch(targetSourceMode: boolean) {
  const ratio = getSavedScrollRatio(targetSourceMode)

  nextTick(() => {
    requestAnimationFrame(() => {
      if (targetSourceMode) {
        setTextareaScrollRatio(ratio)
      } else {
        editorRef.value?.setScrollRatio(ratio)
      }
    })
  })
}

function openSearch() {
  searchVisible.value = true
  searchQuery.value = ''
  searchMatchCount.value = 0
  searchCurrentIndex.value = 0
  sourceSearchMatches.value = []
  sourceSearchCurrentIndex.value = 0
  nextTick(() => {
    document.querySelector<HTMLInputElement>('.search-input')?.focus()
  })
}

function closeSearch() {
  searchVisible.value = false
  searchQuery.value = ''
  searchMatchCount.value = 0
  searchCurrentIndex.value = 0
  sourceSearchMatches.value = []
  sourceSearchCurrentIndex.value = 0
  editorRef.value?.clearSearch()
}

function findSourceMatches(query: string) {
  if (!query.trim()) return []

  const content = sourceTextareaRef.value?.value ?? localContent.value
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const matches: Array<{ start: number; end: number }> = []
  let index = 0

  while (true) {
    index = lowerContent.indexOf(lowerQuery, index)
    if (index === -1) break
    matches.push({ start: index, end: index + query.length })
    index += 1
  }

  return matches
}

function updateSourceSearchState(query = searchQuery.value) {
  sourceSearchMatches.value = findSourceMatches(query)
  sourceSearchCurrentIndex.value = sourceSearchMatches.value.length > 0
    ? Math.min(sourceSearchCurrentIndex.value, sourceSearchMatches.value.length - 1)
    : 0
  searchMatchCount.value = sourceSearchMatches.value.length
  searchCurrentIndex.value = searchMatchCount.value > 0 ? sourceSearchCurrentIndex.value + 1 : 0
}

function selectSourceMatch(index: number) {
  const textarea = sourceTextareaRef.value
  const match = sourceSearchMatches.value[index]
  if (!textarea || !match) return

  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(match.start, match.end)
    const beforeMatch = textarea.value.slice(0, match.start)
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || settingStore.settings.fontSize * 1.6
    const lineIndex = beforeMatch.split('\n').length - 1
    const centered = lineIndex * lineHeight - textarea.clientHeight / 3
    textarea.scrollTop = Math.max(0, centered)
  })
}

function applySearchQuery(query: string) {
  if (isSourceMode.value) {
    updateSourceSearchState(query)
  } else {
    editorRef.value?.setSearchQuery(query)
    const state = editorRef.value?.getSearchState()
    if (state) {
      searchMatchCount.value = state.matches
      searchCurrentIndex.value = state.matches > 0 ? state.currentIndex + 1 : 0
    }
  }
}

function handleSearchInput(e: Event) {
  const query = (e.target as HTMLInputElement).value
  searchQuery.value = query
  sourceSearchCurrentIndex.value = 0
  applySearchQuery(query)
}

function handleSearchPrev() {
  if (searchMatchCount.value === 0) return

  if (isSourceMode.value) {
    sourceSearchCurrentIndex.value = (sourceSearchCurrentIndex.value - 1 + sourceSearchMatches.value.length) % sourceSearchMatches.value.length
    searchCurrentIndex.value = sourceSearchCurrentIndex.value + 1
    selectSourceMatch(sourceSearchCurrentIndex.value)
  } else {
    editorRef.value?.searchPrev()
    const state = editorRef.value?.getSearchState()
    if (state) {
      searchCurrentIndex.value = state.currentIndex + 1
    }
  }
}

function handleSearchNext() {
  if (searchMatchCount.value === 0) return

  if (isSourceMode.value) {
    sourceSearchCurrentIndex.value = (sourceSearchCurrentIndex.value + 1) % sourceSearchMatches.value.length
    searchCurrentIndex.value = sourceSearchCurrentIndex.value + 1
    selectSourceMatch(sourceSearchCurrentIndex.value)
  } else {
    editorRef.value?.searchNext()
    const state = editorRef.value?.getSearchState()
    if (state) {
      searchCurrentIndex.value = state.currentIndex + 1
    }
  }
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeSearch()
  } else if (e.key === 'Enter') {
    if (e.shiftKey) {
      handleSearchPrev()
    } else {
      handleSearchNext()
    }
    e.preventDefault()
  }
}

function handleEditorUpdate(md: string) {
  localContent.value = md
  if (currentNote.value) {
    noteStore.updateNote(currentNote.value.id, { content: md })
  }
}

// 处理源码模式下的输入事件，确保内容实时同步
function handleSourceInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  localContent.value = target.value
  if (currentNote.value) {
    noteStore.updateNote(currentNote.value.id, { content: target.value })
  }
  if (searchVisible.value) {
    updateSourceSearchState()
  }
}

function handleSourceKeydown(e: KeyboardEvent) {
  if (searchVisible.value) {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSearch()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        handleSearchPrev()
      } else {
        handleSearchNext()
      }
      return
    }
  }

  if (e.key !== 'Tab' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return

  const textarea = e.target as HTMLTextAreaElement
  if (textarea.readOnly) return

  e.preventDefault()
  textarea.setRangeText(createSourceTabInsertText(settingStore.settings.tabSize), textarea.selectionStart, textarea.selectionEnd, 'end')
  localContent.value = textarea.value
  if (currentNote.value) {
    noteStore.updateNote(currentNote.value.id, { content: textarea.value })
  }
}

// 目录选择器弹出状态
const dirPickerVisible = ref(false)

function toggleDirPicker() {
  dirPickerVisible.value = !dirPickerVisible.value
}

function handleDirSelect(id: string | null) {
  noteStore.setFilterDirectory(id)
  dirPickerVisible.value = false
}


// 自定义切换源码模式函数，确保内容同步
function handleToggleSourceMode() {
  saveCurrentModeScrollRatio()
  const targetSourceMode = !isSourceMode.value

  // 如果当前是源码模式，切换到普通模式前确保内容同步
  if (isSourceMode.value && sourceTextareaRef.value) {
    // 手动同步 textarea 的内容到 localContent
    localContent.value = sourceTextareaRef.value.value
    if (currentNote.value) {
      noteStore.updateNote(currentNote.value.id, { content: sourceTextareaRef.value.value })
    }
  }
  // 切换模式
  toggleSourceMode()
  restoreScrollAfterModeSwitch(targetSourceMode)
}
</script>

<template>
  <div class="editor-container">
    <!-- navigation hint toast - 显示在工具栏上方 -->
    <Transition name="hint-fade">
      <div v-if="noteStore.navigationHint.visible" class="navigation-hint">
        <i class="i-mdi-information"></i>
        <span>{{ noteStore.navigationHint.message }}</span>
      </div>
    </Transition>

    <div class="editor-wrapper">
      <div
        class="editor-content-wrapper"
        :key="currentNote?.id"
        :class="[`dir-${noteStore.navDirection}`, { 'vortex-deleting': vortexDeleting }]"
      >
        <!-- 源码模式编辑 -->
        <textarea
          v-if="isSourceMode"
          ref="sourceTextareaRef"
          :value="localContent"
          @input="handleSourceInput"
          @keydown="handleSourceKeydown"
          class="source-textarea"
          :style="currentNote?.backgroundColor ? { background: currentNote.backgroundColor + ' !important' } : {}"
          :readonly="isLocked"
          :placeholder="$t('editor.sourcePlaceholder')"
        ></textarea>

        <!-- 正常 Markdown 编辑模式 -->
        <TiptapEditor
          v-else
          ref="editorRef"
          :key="currentNote?.id"
          :initial-content="localContent"
          :font-size="settingStore.settings.fontSize"
          :font-family="settingStore.settings.fontFamily"
          :is-locked="isLocked"
          :note-bg-color="currentNote?.backgroundColor"
          @update="handleEditorUpdate"
        />
      </div>

      <!-- navigation hints -->
      <div v-if="noteStore.activeIndex > 0" class="nav-hint left-hint" @click.stop="noteStore.selectPrev()">
        <i class="i-mdi-chevron-left"></i>
      </div>
      <div v-if="noteStore.activeIndex < noteStore.activeNoteList.length - 1" class="nav-hint right-hint" @click.stop="noteStore.selectNext()">
        <i class="i-mdi-chevron-right"></i>
      </div>

      <div class="right-bottom-controls">
        <!-- source mode toggle button -->
        <button
          class="source-mode-button"
          :class="{ 'is-active': isSourceMode }"
          @click.stop="handleToggleSourceMode"
          :title="isSourceMode ? $t('editor.switchMarkdown') : $t('editor.switchSource')"
        >
          <i v-if="isSourceMode" class="i-mdi-markdown"></i>
          <i v-else class="i-mdi-code-tags"></i>
        </button>

        <!-- lock button -->
        <button
          class="lock-button"
          :class="{ 'is-locked': isLocked }"
          @click.stop="toggleLock"
          :title="isLocked ? $t('editor.unlockNote') : $t('editor.lockNote')"
        >
          <i v-if="isLocked" class="i-mdi-lock"></i>
          <i v-else class="i-mdi-lock-open-variant"></i>
        </button>

        <!-- note indicator -->
        <div class="note-indicator" @click.stop>
          {{ $t('editor.noteIndicator', { index: noteStore.activeIndex + 1, total: noteStore.activeNoteList.length }) }}
        </div>
      </div>

      <!-- 目录指示器 -->
      <div class="dir-indicator" @click.stop="toggleDirPicker">
        <i class="i-mdi-folder-outline"></i>
        <span>{{ currentDirName }}</span>
        <i class="i-mdi-chevron-down" :class="{ rotated: dirPickerVisible }"></i>
      </div>

      <!-- 目录选择器弹出 -->
      <div v-if="dirPickerVisible" class="dir-picker-overlay" @click="dirPickerVisible = false">
        <div class="dir-picker-popup" @click.stop>
          <DirectoryTree :on-select="handleDirSelect" :show-trash="false" />
        </div>
      </div>

      <!-- bottom bar: word count, color, search -->
      <div class="bottom-bar">
        <div v-show="!searchVisible" class="word-count" @click.stop>
          {{ $t('editor.wordCount', { count: wordCount }) }}
        </div>
        <button
          class="color-btn"
          :class="{ 'has-color': currentNote?.backgroundColor }"
          @click.stop="toggleColorPicker"
          :title="$t('editor.noteBgColor')"
        >
          <i class="i-mdi-palette-outline"></i>
        </button>
        <button
          v-if="!searchVisible"
          class="search-toggle-btn"
          @click.stop="openSearch"
          :title="$t('editor.searchInNote')"
        >
          <i class="i-mdi-magnify"></i>
        </button>
      </div>

      <!-- color picker popup -->
      <div v-if="colorPickerVisible" class="color-picker-overlay" @click="colorPickerVisible = false">
        <NoteColorPicker
          class="color-picker-wrapper"
          :model-value="currentNote?.backgroundColor"
          :colors="NOTE_COLORS"
          @update:model-value="handleColorSelect"
          @close="colorPickerVisible = false"
        />
      </div>

      <!-- search bar -->
      <div v-if="searchVisible" class="search-bar" @click.stop>
        <input
          type="text"
          class="search-input"
          :placeholder="$t('editor.searchPlaceholder')"
          :value="searchQuery"
          @input="handleSearchInput"
          @keydown="handleSearchKeydown"
        />
        <span v-if="searchQuery" class="search-count">
          {{ searchMatchCount > 0 ? `${searchCurrentIndex}/${searchMatchCount}` : '0/0' }}
        </span>
        <button
          class="search-nav-btn"
          @click="handleSearchPrev"
          :disabled="searchMatchCount === 0"
          :title="$t('editor.searchPrev')"
        >
          <i class="i-mdi-chevron-up"></i>
        </button>
        <button
          class="search-nav-btn"
          @click="handleSearchNext"
          :disabled="searchMatchCount === 0"
          :title="$t('editor.searchNext')"
        >
          <i class="i-mdi-chevron-down"></i>
        </button>
        <button class="search-close-btn" @click="closeSearch" :title="$t('editor.searchClose')">
          <i class="i-mdi-close"></i>
        </button>
      </div>

      <!-- save indicator -->
      <div v-if="isSaving" class="save-indicator" @click.stop>
        <i class="i-mdi-loading spinning"></i>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.editor-wrapper {
  --bottom-control-gap: 8px;

  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 8px;
  background: transparent;
}

.source-textarea {
  position: relative;
  z-index: 10;
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 48px 56px;
  overflow: auto;
  background: var(--note-bg, transparent) !important;
  color: var(--color-text);
  border: none;
  outline: none;
  resize: none;
  font-family: v-bind('settingStore.settings.fontFamily');
  font-size: v-bind('settingStore.settings.fontSize + "px"');
  line-height: 1.75;
  white-space: pre-wrap;
  word-wrap: break-word;
  box-sizing: border-box;
  border-radius: var(--radius-lg);
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.source-textarea::placeholder {
  color: var(--color-text-secondary);
}

.source-textarea:read-only {
  cursor: not-allowed;
  background: var(--color-surface);
}

.editor-content-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* key 变化时 DOM 重建，CSS animation 自动触发 */
  animation-duration: 420ms;
  animation-timing-function: var(--ease-out);
}

/* 从右侧进入（下一条笔记） */
.editor-content-wrapper.dir-right {
  animation-name: note-slide-in-right;
}

/* 从左侧进入（上一条） */
.editor-content-wrapper.dir-left {
  animation-name: note-slide-in-left;
}

@keyframes note-slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes note-slide-in-left {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 从下方进入（下一个目录） */
.editor-content-wrapper.dir-down {
  animation-name: note-slide-in-down;
}

/* 从上方进入（上一个目录） */
.editor-content-wrapper.dir-up {
  animation-name: note-slide-in-up;
}

@keyframes note-slide-in-down {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes note-slide-in-up {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.nav-hint {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out), transform var(--duration-normal) var(--ease-out), background-color var(--duration-fast) var(--ease-out);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  user-select: none;
  -webkit-user-select: none;
}

.left-hint {
  left: 10px;
}

.right-hint {
  right: 10px;
}

.editor-wrapper:hover .nav-hint {
  opacity: 0.5;
}

.nav-hint:hover {
  opacity: 0.8 !important;
  background-color: var(--color-popup-bg);
}

.nav-hint:active {
  transform: translateY(-50%) scale(0.92);
}

.nav-hint i {
  font-size: 20px;
}

.right-bottom-controls {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 11;
  display: flex;
  align-items: center;
  gap: var(--bottom-control-gap);
}

.note-indicator {
  padding: 5px 12px;
  background-color: var(--color-surface);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-xs);
  pointer-events: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
  -webkit-user-select: none;
}

.dir-indicator {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 11;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  background-color: var(--color-surface);
  border-radius: 20px;
  font-size: 12px;
  color: var(--color-primary);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
  -webkit-user-select: none;
  transition: background var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.dir-indicator:hover {
  background-color: var(--color-popup-bg);
  box-shadow: var(--shadow-sm);
}

.dir-indicator:active {
  transform: translateX(-50%) scale(0.97);
}

.dir-indicator i.i-mdi-chevron-down {
  font-size: 14px;
  transition: transform 0.2s;
}

.dir-indicator i.i-mdi-chevron-down.rotated {
  transform: rotate(180deg);
}

.dir-indicator i {
  font-size: 14px;
}

.dir-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
}

.dir-picker-popup {
  position: absolute;
  bottom: 48px;
  width: 280px;
  height: 50vh;
  max-height: 50vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
}

.lock-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
  -webkit-user-select: none;
}

.lock-button:hover {
  color: var(--color-text);
  background-color: var(--color-popup-bg);
}

.lock-button:active {
  transform: scale(0.92);
}

.lock-button.is-locked {
  color: var(--color-primary);
}

.lock-button i {
  font-size: 15px;
}

.source-mode-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
  -webkit-user-select: none;
}

.source-mode-button:hover {
  color: var(--color-text);
  background-color: var(--color-popup-bg);
}

.source-mode-button:active {
  transform: scale(0.92);
}

.source-mode-button.is-active {
  color: var(--color-primary);
}

.source-mode-button i {
  font-size: 15px;
}

.bottom-bar {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 11;
  display: flex;
  align-items: center;
  gap: var(--bottom-control-gap);
}

.word-count {
  padding: 5px 12px;
  background-color: var(--color-surface);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-xs);
  pointer-events: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
  -webkit-user-select: none;
}

.search-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
  -webkit-user-select: none;
}

.search-toggle-btn:hover {
  color: var(--color-text);
  background-color: var(--color-popup-bg);
}

.search-toggle-btn:active {
  transform: scale(0.92);
}

.search-toggle-btn i {
  font-size: 15px;
}

.color-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
  -webkit-user-select: none;
}

.color-btn:hover {
  color: var(--color-text);
  background-color: var(--color-popup-bg);
}

.color-btn:active {
  transform: scale(0.92);
}

.color-btn.has-color {
  color: var(--color-primary);
}

.color-btn i {
  font-size: 15px;
}

.color-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
}

.color-picker-wrapper {
  position: absolute;
  bottom: 50px;
  left: 118px;
}

.search-bar {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: var(--color-surface);
  border-radius: 20px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
  -webkit-user-select: none;
}

.search-input {
  width: 140px;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 12px;
  outline: none;
}

.search-input::placeholder {
  color: var(--color-text-secondary);
}

.search-count {
  font-size: 11px;
  color: var(--color-text-secondary);
  min-width: 30px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.search-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.search-nav-btn:hover:not(:disabled) {
  background: var(--color-popup-hover);
  color: var(--color-text);
}

.search-nav-btn:active:not(:disabled) {
  transform: scale(0.9);
}

.search-nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.search-nav-btn i {
  font-size: 14px;
}

.search-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.search-close-btn:hover {
  background: var(--color-popup-hover);
  color: var(--color-text);
}

.search-close-btn:active {
  transform: scale(0.9);
}

.search-close-btn i {
  font-size: 14px;
}

.save-indicator {
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: var(--color-surface);
  border-radius: 50%;
  color: var(--color-primary);
  box-shadow: var(--shadow-xs);
  pointer-events: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  user-select: none;
  -webkit-user-select: none;
}

.spinning {
  animation: spin 1s linear infinite;
  font-size: 16px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.navigation-hint {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  color: var(--color-text);
  box-shadow: var(--shadow-md);
  font-size: 14px;
  pointer-events: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 10;
}

.navigation-hint i {
  font-size: 18px;
  color: var(--color-primary);
}

.navigation-hint {
  user-select: none;
  -webkit-user-select: none;
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.hint-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.hint-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* 彩虹漩涡轨迹层：环形色带，靠 transform 旋转带动色带流动（GPU 合成，零逐帧重绘） */
:deep(.vortex-rainbow) {
  position: absolute;
  inset: -15%;
  pointer-events: none;
  border-radius: 50%;
  z-index: 100;
  background: conic-gradient(
    from 0deg,
    #ff3b3b, #ff9d3b, #fff23b, #6dff3b,
    #3bffe0, #3b8bff, #a13bff, #ff3bd6,
    #ff3b3b
  );
  -webkit-mask-image: radial-gradient(circle at 50% 50%,
    rgba(0,0,0,0.15) 0%,
    rgba(0,0,0,0.9) 26%,
    rgba(0,0,0,1) 38%,
    rgba(0,0,0,0.7) 52%,
    rgba(0,0,0,0) 68%
  );
  mask-image: radial-gradient(circle at 50% 50%,
    rgba(0,0,0,0.15) 0%,
    rgba(0,0,0,0.9) 26%,
    rgba(0,0,0,1) 38%,
    rgba(0,0,0,0.7) 52%,
    rgba(0,0,0,0) 68%
  );
  filter: blur(1.5px) saturate(1.8);
  mix-blend-mode: normal;
  will-change: transform, opacity;
}

/* 漩涡删除期间阻止交互 */
.editor-content-wrapper.vortex-deleting {
  pointer-events: none;
}
</style>
