<script setup lang="ts">
defineProps<{
  href: string | null;
  filename: string;
  label?: string;
}>();
</script>

<template>
  <a
    v-if="href"
    :href="href"
    :download="filename"
    class="btn btn-sm btn-link p-0 text-decoration-none small"
  >
    {{ label || "Download" }}
  </a>
</template>
