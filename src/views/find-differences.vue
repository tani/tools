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
    <div class="row">
      <div class="col-sm-6 mb-3">
        <div class="card h-100">
          <div class="card-header">Old</div>
          <div class="card-body p-0">
            <textarea id="oldText" v-model="oldText" class="form-control border-0 font-monospace p-3" rows="10" style="resize: none;" />
          </div>
        </div>
      </div>
      <div class="col-sm-6 mb-3">
        <div class="card h-100">
          <div class="card-header">New</div>
          <div class="card-body p-0">
            <textarea id="newText" v-model="newText" class="form-control border-0 font-monospace p-3" rows="10" style="resize: none;" />
          </div>
        </div>
      </div>
      <div class="col-sm-12">
        <div class="card">
          <div class="card-header">Diff</div>
          <div class="card-body p-0">
            <div id="diffText" class="diff-container border-0">
              <DiffView v-if="diffFile" :diff-file="diffFile" :diff-view-mode="DiffModeEnum.Unified" />
              <div v-else class="p-3 text-center text-muted">No differences found</div>
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
