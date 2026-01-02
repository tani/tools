<script setup lang="ts">
import { computed, ref } from "vue";
import { DiffModeEnum, DiffView } from "@git-diff-view/vue";
import { generateDiffFile } from "@git-diff-view/file";

const text = ref("");
const replaceText = ref("");
const search = ref("");
const copyBtnText = ref("Copy");

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

const copyToClipboard = () => {
  navigator.clipboard.writeText(result.value).then(() => {
    copyBtnText.value = "Copied!";
    setTimeout(() => {
      copyBtnText.value = "Copy";
    }, 2000);
  });
};
</script>

<template>
  <div>
    <h2 class="display-6">Replace Text</h2>
    <p class="text-muted">
      Search and replace text using regular expressions with a side-by-side diff preview.
    </p>
    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label for="search" class="form-label fw-bold">Search</label>
            <input id="search" v-model="search" class="form-control" placeholder="Regex pattern" />
          </div>
          <div class="col-md-6">
            <label for="replace" class="form-label fw-bold">Replace</label>
            <input id="replace" v-model="replaceText" class="form-control" placeholder="Replacement text" />
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-sm-6 mb-3">
        <div class="card h-100">
          <div class="card-header">Input</div>
          <div class="card-body p-0">
            <textarea id="text" v-model="text" class="form-control border-0 font-monospace p-3" rows="20" style="resize: none;" />
          </div>
        </div>
      </div>
      <div class="col-sm-6 mb-3">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Output</span>
            <button class="btn btn-sm btn-link p-0 text-decoration-none" @click="copyToClipboard">
              {{ copyBtnText }}
            </button>
          </div>
          <div class="card-body p-0">
            <textarea id="result" class="form-control border-0 font-monospace p-3 bg-light" :value="result" readonly rows="20" style="resize: none;" />
          </div>
        </div>
      </div>
    </div>
    <div v-if="diffFile" class="mt-5">
      <DiffView :diff-file="diffFile" :diff-view-mode="DiffModeEnum.Split" />
    </div>
  </div>
</template>

<style scoped>
.font-monospace {
  font-family: var(--bs-font-monospace);
}
</style>
