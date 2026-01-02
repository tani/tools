<script setup lang="ts">
import { computed, ref } from "vue";
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";
import { DiffModeEnum, DiffView } from "@git-diff-view/vue";
import { generateDiffFile } from "@git-diff-view/file";

const oldText = ref("This is the original text.\nIt has several lines.\nOne line will be removed.\nAnother will be changed.");
const newText = ref("This is the modified text.\nIt has several lines.\nAnother has been changed.\nOne line was added.");

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
    <ToolHeader
      title="Diff"
      description="Compare two text blocks and visualize the differences using a unified diff view."
    />

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Old Version" class="h-100" no-padding>
          <textarea
            id="oldText"
            v-model="oldText"
            class="form-control border-0 font-monospace p-3"
            rows="10"
            style="resize: none;"
          />
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="New Version" class="h-100" no-padding>
          <textarea
            id="newText"
            v-model="newText"
            class="form-control border-0 font-monospace p-3"
            rows="10"
            style="resize: none;"
          />
        </ToolCard>
      </div>
      <div class="col-12 mb-4">
        <ToolCard title="Visual Diff" no-padding>
          <div id="diffText" class="diff-container border-0 rounded-0">
            <DiffView
              v-if="diffFile"
              :diff-file="diffFile"
              :diff-view-mode="DiffModeEnum.Unified"
            />
            <div v-else class="p-5 text-center text-muted">
              No differences found between the two versions
            </div>
          </div>
        </ToolCard>
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
