<script setup lang="ts">
defineProps<{
  label?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits(["change"]);

const handleChange = (event: Event) => {
  emit("change", event);
};
</script>

<template>
  <div>
    <label v-if="label" class="form-label fw-bold small">{{ label }}</label>
    <input
      class="form-control"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      @change="handleChange"
    />
  </div>
</template>
