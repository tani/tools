<script setup lang="ts">
import { computed, ref } from "vue";
import { DiffModeEnum, DiffView } from "@git-diff-view/vue";
import { generateDiffFile } from "@git-diff-view/file";

const text = ref("The year is 2025. The next year will be 2026. My favorite numbers are 7 and 42.");
const replaceText = ref("[year]");
const search = ref("\\d{4}");
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
    <p class="text-muted mb-4">
      Search and replace text using regular expressions with a side-by-side diff preview.
    </p>
    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label for="search" class="form-label fw-bold small">Search Pattern (Regex)</label>
            <input id="search" v-model="search" class="form-control" placeholder="e.g., \d+" />
          </div>
          <div class="col-md-6">
            <label for="replace" class="form-label fw-bold small">Replacement Text</label>
            <input
              id="replace"
              v-model="replaceText"
              class="form-control"
              placeholder="e.g., [number]"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Input</div>
          <div class="card-body p-0">
            <textarea
              id="text"
              v-model="text"
              class="form-control border-0 font-monospace p-3"
              rows="20"
              style="resize: none;"
            />
          </div>
        </div>
      </div>
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold small text-uppercase text-muted">Output</span>
            <button
              class="btn btn-sm btn-link p-0 text-decoration-none small"
              @click="copyToClipboard"
            >
              {{ copyBtnText }}
            </button>
          </div>
          <div class="card-body p-0">
            <textarea
              id="result"
              class="form-control border-0 font-monospace p-3 bg-light"
              :value="result"
              readonly
              rows="20"
              style="resize: none;"
            />
          </div>
        </div>
      </div>
    </div>
    <div v-if="diffFile" class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Visual Diff</div>
          <div class="card-body p-0">
            <DiffView :diff-file="diffFile" :diff-view-mode="DiffModeEnum.Split" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-monospace {
  font-family: var(--bs-font-monospace);
}
</style>
