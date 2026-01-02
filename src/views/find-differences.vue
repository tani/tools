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
      <div class="col-sm-6">
        <label for="oldText" class="form-label">Old</label>
        <textarea id="oldText" v-model="oldText" class="form-control" rows="10" />
      </div>
      <div class="col-sm-6">
        <label for="newText" class="form-label">New</label>
        <textarea id="newText" v-model="newText" class="form-control" rows="10" />
      </div>
      <div class="col-sm-12">
        <label for="diffText" class="form-label">Diff</label>
        <div id="diffText" class="diff-container">
          <DiffView v-if="diffFile" :diff-file="diffFile" :diff-view-mode="DiffModeEnum.Unified" />
          <div v-else class="p-3 text-center text-muted">No differences found</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-container {
  height: 18em;
  border-radius: 5px;
  border: solid 1px #ccc;
  overflow-y: scroll;
}
</style>
