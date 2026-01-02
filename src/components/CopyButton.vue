<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  content: string;
}>();

const copyBtnText = ref("Copy");

const copyToClipboard = () => {
  if (!props.content) return;
  navigator.clipboard.writeText(props.content).then(() => {
    copyBtnText.value = "Copied!";
    setTimeout(() => {
      copyBtnText.value = "Copy";
    }, 2000);
  });
};
</script>

<template>
  <button
    class="btn btn-sm btn-link p-0 text-decoration-none small"
    :disabled="!content"
    @click="copyToClipboard"
  >
    {{ copyBtnText }}
  </button>
</template>
