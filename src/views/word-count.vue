<script setup lang="ts">
import { computed, ref } from "vue";

const input = ref("");

const countGraphemeClusters = (text: string) => {
  const segmenter = new Intl.Segmenter("en", {
    granularity: "grapheme",
  });
  const segments = segmenter.segment(text);
  return Array.from(segments).length;
};

const countWords = (text: string) => {
  const segmenter = new Intl.Segmenter("en", {
    granularity: "word",
  });
  const segments = segmenter.segment(text);
  let wordCount = 0;
  for (const { isWordLike } of segments) {
    if (isWordLike) {
      wordCount++;
    }
  }
  return wordCount;
};

const graphemeCount = computed(() => countGraphemeClusters(input.value));
const wordCount = computed(() => countWords(input.value));
const lineCount = computed(() => input.value.split(/\r\n|\r|\n/).length);
</script>

<template>
  <div>
    <h2 class="display-6">Word Count</h2>
    <p class="text-muted">
      Count characters, words, and lines in your text using high-precision segmentation.
    </p>
    <div class="row">
      <div class="col-sm-12">
        <table class="table">
          <tbody>
            <tr>
              <th>Characters</th>
              <td>{{ graphemeCount }}</td>
              <th>Words</th>
              <td>{{ wordCount }}</td>
              <th>Lines</th>
              <td>{{ lineCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="row">
      <div class="col-sm-12">
        <div class="card">
          <div class="card-header">Input</div>
          <div class="card-body p-0">
            <textarea v-model="input" class="form-control border-0 font-monospace p-3" rows="20" style="resize: none;" />
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
