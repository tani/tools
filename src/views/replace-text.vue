<script setup lang="ts">
import { computed, ref } from "vue";
import { DiffModeEnum, DiffView } from "@git-diff-view/vue";
import { generateDiffFile } from "@git-diff-view/file";

const text = ref("");
const replaceText = ref("");
const search = ref("");

const result = computed(() => {
  try {
    if (!search.value) return text.value;
    return text.value.replace(new RegExp(search.value, "g"), replaceText.value);
  } catch {
    return text.value;
  }
});

const diffFile = computed(() => {
  let oldText = (text.value || "").replace(/\r\n/g, "\n");
  let newText = (result.value || "").replace(/\r\n/g, "\n");
  if (oldText === newText) return null;

  if (oldText && !oldText.endsWith("\n")) oldText += "\n";
  if (newText && !newText.endsWith("\n")) newText += "\n";

  const file = generateDiffFile("Deleted", oldText, "Added", newText, "plaintext", "plaintext");
  file.initRaw();
  return file;
});
</script>

<template>
  <div>
    <h2 class="display-6">Replace Text</h2>
    <label for="search" class="form-label">Search</label>
    <input id="search" v-model="search" class="form-control" />
    <label for="replace" class="form-label">Replace</label>
    <input id="replace" v-model="replaceText" class="form-control" />
    <div class="row">
      <div class="col-sm-6">
        <label for="text" class="form-label">Input</label>
        <textarea id="text" v-model="text" class="form-control" rows="20" />
      </div>
      <div class="col-sm-6">
        <label for="result" class="form-label">Output</label>
        <textarea id="result" class="form-control" :value="result" readonly rows="20" />
      </div>
    </div>
    <div v-if="diffFile" class="mt-5">
      <DiffView :diff-file="diffFile" :diff-view-mode="DiffModeEnum.Split" />
    </div>
  </div>
</template>
