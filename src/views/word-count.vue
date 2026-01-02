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
    <p class="text-muted mb-4">
      Count characters, words, and lines in your text using high-precision segmentation.
    </p>
    <div class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Statistics Summary</div>
          <div class="card-body p-0">
            <table class="table table-bordered mb-0">
              <tbody>
                <tr>
                  <th class="ps-3 small text-uppercase text-muted">Characters</th>
                  <td class="fw-bold fs-5">{{ graphemeCount }}</td>
                  <th class="ps-3 small text-uppercase text-muted">Words</th>
                  <td class="fw-bold fs-5">{{ wordCount }}</td>
                  <th class="ps-3 small text-uppercase text-muted">Lines</th>
                  <td class="fw-bold fs-5 pe-3 text-end">{{ lineCount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Input Text</div>
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
