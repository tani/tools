<script setup lang="ts">
import { computed, ref } from "vue";

const input = ref("The quick brown fox jumps over the lazy dog.\n\nVue.js is an approachable, performant, and versatile framework for building web user interfaces.");

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
            <div class="row g-0 text-center">
              <div class="col-md-4 border-end py-4">
                <div class="small text-uppercase text-muted mb-1" style="font-size: 0.75rem;">
                  Characters
                </div>
                <div class="display-6 fw-bold text-primary">{{ graphemeCount }}</div>
              </div>
              <div class="col-md-4 border-end py-4">
                <div class="small text-uppercase text-muted mb-1" style="font-size: 0.75rem;">
                  Words
                </div>
                <div class="display-6 fw-bold text-primary">{{ wordCount }}</div>
              </div>
              <div class="col-md-4 py-4">
                <div class="small text-uppercase text-muted mb-1" style="font-size: 0.75rem;">
                  Lines
                </div>
                <div class="display-6 fw-bold text-primary">{{ lineCount }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Input Text</div>
          <div class="card-body p-0">
            <textarea
              v-model="input"
              class="form-control border-0 font-monospace p-3"
              rows="20"
              style="resize: none;"
            />
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
