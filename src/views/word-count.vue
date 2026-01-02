<script setup lang="ts">
import { computed, ref } from "vue";
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";

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
    <ToolHeader
      title="Word Count"
      description="Count characters, words, and lines in your text using high-precision segmentation."
    />
    <div class="row">
      <div class="col-12 mb-4">
        <ToolCard title="Statistics Summary" no-padding>
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
        </ToolCard>
      </div>
    </div>
    <div class="row">
      <div class="col-12 mb-4">
        <ToolCard title="Input Text" no-padding>
          <MonospaceEditor v-model="input" />
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-monospace {
  font-family: var(--bs-font-monospace);
}
</style>
