<script setup lang="ts">
import { computed, ref } from "vue";
import { DiffModeEnum, DiffView } from "@git-diff-view/vue";
import { generateDiffFile } from "@git-diff-view/file";

const oldText = ref("");
const newText = ref("");

const diffFile = computed(() => {
  let oldValue = (oldText.value || "").replace(/\r\n/g, "\n");
  let newValue = (newText.value || "").replace(/\r\n/g, "\n");
  if (oldValue === newValue) return null;

  if (oldValue && !oldValue.endsWith("\n")) oldValue += "\n";
  if (newValue && !newValue.endsWith("\n")) newValue += "\n";

  const file = generateDiffFile("oldText", oldValue, "newText", newValue, "plaintext", "plaintext");
  file.initRaw();
  return file;
});
</script>

<template>
  <div>
    <h2 class="display-6">Diff Text</h2>
    <p class="text-muted mb-4">
      Compare two text blocks and visualize the differences using a unified diff view.
    </p>
    <div class="row">
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Old Version</div>
          <div class="card-body p-0">
            <textarea id="oldText" v-model="oldText" class="form-control border-0 font-monospace p-3" rows="10" style="resize: none;" />
          </div>
        </div>
      </div>
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">New Version</div>
          <div class="card-body p-0">
            <textarea id="newText" v-model="newText" class="form-control border-0 font-monospace p-3" rows="10" style="resize: none;" />
          </div>
        </div>
      </div>
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Visual Diff</div>
          <div class="card-body p-0">
            <div id="diffText" class="diff-container border-0 rounded-0">
              <DiffView v-if="diffFile" :diff-file="diffFile" :diff-view-mode="DiffModeEnum.Unified" />
              <div v-else class="p-5 text-center text-muted">No differences found between the two versions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-container {
  height: 18em;
  overflow-y: scroll;
}
.font-monospace {
  font-family: var(--bs-font-monospace);
}
</style>
