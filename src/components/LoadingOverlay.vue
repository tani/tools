<script setup lang="ts">
defineProps<{
  loading: boolean;
  message?: string;
}>();
</script>

<template>
  <div v-if="loading" class="text-center py-5">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
    <div v-if="message" class="mt-2 text-muted small fw-bold text-uppercase">
      {{ message }}
    </div>
  </div>
</template>
