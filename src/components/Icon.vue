<script setup lang="ts">
withDefaults(defineProps<{
  name: string
  size?: number
}>(), {
  size: 18,
})
</script>

<template>
  <i
    :class="`i-mdi-${name}`"
    :style="{ fontSize: size + 'px' }"
    aria-hidden="true"
  ></i>
</template>
