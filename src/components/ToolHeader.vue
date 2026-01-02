<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <h2 class="display-6">{{ title }}</h2>
  <p v-if="description" class="text-muted mb-4">{{ description }}</p>
</template>
