<script setup lang="ts">
defineProps<{
  modelValue: string;
  readonly?: boolean;
  placeholder?: string;
  rows?: number | string;
  bgLight?: boolean;
}>();

defineEmits(["update:modelValue"]);
</script>

<template>
  <textarea
    :value="modelValue"
    :readonly="readonly"
    :placeholder="placeholder"
    :rows="rows || 20"
    :class="['form-control border-0 font-monospace p-3', bgLight ? 'bg-light' : '']"
    style="resize: none;"
    spellcheck="false"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
