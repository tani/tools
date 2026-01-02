<script setup lang="ts">
import { computed, ref } from "vue";
import {
  buildHighlightedHtml,
  compileOnigurumaRegex,
  findMatches,
  type OnigurumaTarget,
} from "../utils/text-finder";

const text = ref(
  "Oniguruma powers regex in Ruby, TextMate grammars, and many editors.\nTry patterns like \\h+, (?x) with comments, or Unicode classes like \\p{L}.\nFind hex: deadBEEF, cafe, 1234, and mix of words.",
);
const pattern = ref("\\b\\h+\\b");
const flags = ref("i");
const target = ref<OnigurumaTarget>("auto");
const maxMatches = ref(500);
const copyBtnText = ref("Copy");

const compileResult = computed(() =>
  compileOnigurumaRegex(pattern.value, { flags: flags.value, target: target.value }),
);

const matchesResult = computed(() => {
  if (!compileResult.value.compiled) {
    return { matches: [], truncated: false };
  }
  return findMatches(text.value, compileResult.value.compiled, maxMatches.value);
});

const highlightedHtml = computed(() =>
  buildHighlightedHtml(text.value, matchesResult.value.matches),
);

const matchList = computed(() =>
  matchesResult.value.matches
    .map((match) => (match.value === "" ? "(empty match)" : match.value))
    .join("\n"),
);

const matchSummary = computed(() => {
  if (!pattern.value.trim()) {
    return "Enter a pattern";
  }
  if (compileResult.value.error) {
    return "Invalid pattern";
  }
  const count = matchesResult.value.matches.length;
  return matchesResult.value.truncated ? `${count}+ matches (truncated)` : `${count} matches`;
});

const compiledPreview = computed(() => {
  const compiled = compileResult.value.compiled;
  if (!compiled) {
    return "";
  }
  return `/${compiled.pattern}/${compiled.flags}`;
});

const copyMatches = () => {
  if (!matchList.value) {
    return;
  }

  navigator.clipboard.writeText(matchList.value).then(() => {
    copyBtnText.value = "Copied!";
    setTimeout(() => {
      copyBtnText.value = "Copy";
    }, 2000);
  });
};
</script>

<template>
  <div>
    <h2 class="display-6">Text Finder</h2>
    <p class="text-muted mb-4">
      Highlight Oniguruma-style regex matches with an instant preview, powered by
      oniguruma-to-es.
    </p>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-12">
            <label for="pattern" class="form-label fw-bold small">Oniguruma Pattern</label>
            <textarea
              id="pattern"
              v-model="pattern"
              class="form-control font-monospace"
              rows="3"
              placeholder="e.g., \\b\\h+\\b"
            ></textarea>
            <div class="form-text">
              Supports Oniguruma syntax like <span class="font-monospace">\\h</span>,
              <span class="font-monospace">\\R</span>, and inline modifiers.
            </div>
          </div>
          <div class="col-md-4">
            <label for="flags" class="form-label fw-bold small">Flags</label>
            <input
              id="flags"
              v-model="flags"
              class="form-control font-monospace"
              placeholder="i, m, x, D, S, W, y{g}"
            />
            <div class="form-text">Oniguruma <span class="font-monospace">m</span> = JS dotAll.</div>
          </div>
          <div class="col-md-4">
            <label for="target" class="form-label fw-bold small">Target</label>
            <select id="target" v-model="target" class="form-select">
              <option value="auto">Auto</option>
              <option value="ES2018">ES2018</option>
              <option value="ES2024">ES2024</option>
              <option value="ES2025">ES2025</option>
            </select>
            <div class="form-text">Higher targets unlock Unicode set syntax.</div>
          </div>
          <div class="col-md-4">
            <label for="limit" class="form-label fw-bold small">Max Matches</label>
            <input
              id="limit"
              v-model.number="maxMatches"
              type="number"
              class="form-control"
              min="1"
              max="5000"
            />
            <div class="form-text">Stops scanning after the limit to stay fast.</div>
          </div>
          <div class="col-12">
            <div v-if="compileResult.error" class="alert alert-danger mb-0">
              {{ compileResult.error }}
            </div>
            <div v-else class="alert alert-secondary mb-0">
              <strong>Compiled:</strong>
              <span class="font-monospace">{{ compiledPreview || "—" }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Input Text</div>
          <div class="card-body p-0">
            <textarea
              id="text"
              v-model="text"
              class="form-control border-0 font-monospace p-3"
              rows="18"
              style="resize: none;"
            ></textarea>
          </div>
        </div>
      </div>
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold small text-uppercase text-muted">Matches Preview</span>
            <span class="small text-muted">{{ matchSummary }}</span>
          </div>
          <div class="card-body p-3 bg-light">
            <div class="font-monospace text-finder-output" v-html="highlightedHtml"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold small text-uppercase text-muted">Matched Text</span>
            <button
              class="btn btn-sm btn-link p-0 text-decoration-none small"
              :disabled="!matchList"
              @click="copyMatches"
            >
              {{ copyBtnText }}
            </button>
          </div>
          <div class="card-body p-0">
            <textarea
              class="form-control border-0 font-monospace p-3 bg-light"
              :value="matchList"
              rows="8"
              readonly
              style="resize: none;"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-finder-output {
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 100%;
}

.text-finder-highlight {
  background-color: #ffe08a;
  color: #1f2328;
  padding: 0 0.1em;
  border-radius: 0.2em;
}
</style>
