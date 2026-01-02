<script setup lang="ts">
defineProps<{
  title?: string;
  noPadding?: boolean;
}>();
</script>

<template>
  <div class="card shadow-sm h-100">
    <div
      v-if="title || $slots['header-actions']"
      class="card-header d-flex justify-content-between align-items-center"
    >
      <span class="fw-bold small text-uppercase text-muted">{{ title }}</span>
      <slot name="header-actions" />
    </div>
    <div :class="['card-body', noPadding ? 'p-0' : '']">
      <slot />
    </div>
  </div>
</template>
