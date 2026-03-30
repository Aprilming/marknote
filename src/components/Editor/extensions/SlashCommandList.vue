<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  command: (item: { title: string; command: string }) => void
  editor: Editor
}>()

const selectedIndex = ref(0)

const items = [
  { title: 'Todo', command: 'todo' },
  { title: 'Code Block', command: 'code' },
  { title: 'Heading 1', command: 'heading1' },
  { title: 'Heading 2', command: 'heading2' },
  { title: 'Heading 3', command: 'heading3' },
  { title: 'Bullet List', command: 'bulletList' },
  { title: 'Ordered List', command: 'orderedList' },
  { title: 'Quote', command: 'blockquote' },
]

const executeCommand = (cmd: string) => {
  const editor = props.editor
  if (!editor) return

  switch (cmd) {
    case 'todo':
      editor.chain().focus().insertContent('- [ ] ').run()
      break
    case 'code':
      editor.chain().focus().toggleCodeBlock().run()
      break
    case 'heading1':
      editor.chain().focus().toggleHeading({ level: 1 }).run()
      break
    case 'heading2':
      editor.chain().focus().toggleHeading({ level: 2 }).run()
      break
    case 'heading3':
      editor.chain().focus().toggleHeading({ level: 3 }).run()
      break
    case 'bulletList':
      editor.chain().focus().toggleBulletList().run()
      break
    case 'orderedList':
      editor.chain().focus().toggleOrderedList().run()
      break
    case 'blockquote':
      editor.chain().focus().toggleBlockquote().run()
      break
  }
}

const selectItem = (index: number) => {
  const item = items[index]
  if (item) {
    executeCommand(item.command)
  }
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value - 1 + items.length) % items.length
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % items.length
    return true
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div class="slash-command-list">
    <button
      v-for="(item, index) in items"
      :key="index"
      :class="{ 'is-selected': index === selectedIndex }"
      @click="selectItem(index)"
      @mouseenter="selectedIndex = index"
    >
      {{ item.title }}
    </button>
  </div>
</template>

<style scoped>
.slash-command-list {
  padding: 6px;
  background: rgba(30, 30, 30, 0.95);
  border-radius: 8px;
  min-width: 160px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.slash-command-list button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #e0e0e0;
  cursor: pointer;
  border-radius: 4px;
  text-align: left;
  font-size: 13px;
}

.slash-command-list button.is-selected,
.slash-command-list button:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
