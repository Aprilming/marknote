<script setup lang="ts">
import { useNoteStore } from '@/stores/noteStore'

const noteStore = useNoteStore()
</script>

<template>
  <div class="search-bar">
    <div class="search-input-wrapper">
      <i class="i-mdi-magnify search-icon"></i>
      <input
        v-model="noteStore.searchQuery"
        type="text"
        :placeholder="$t('sidebar.searchPlaceholder')"
        class="search-input"
        data-search-input
      />
      <button
        v-if="noteStore.searchQuery"
        class="clear-btn"
        @click="noteStore.searchQuery = ''"
        :title="$t('sidebar.clear')"
      >
        <i class="i-mdi-close"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  padding: 0 var(--space-3) var(--space-3);
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--color-text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 36px;
  padding-left: 36px;
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
  color: var(--color-text);
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.search-input::placeholder {
  color: var(--color-text-secondary);
}

.clear-btn {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
}

.clear-btn:hover {
  background-color: var(--color-border);
}

.clear-btn:active {
  transform: scale(0.9);
}

.clear-btn i {
  font-size: 14px;
}
</style>
