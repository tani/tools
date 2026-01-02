<script setup lang="ts">
import { computed, ref } from "vue";
import jsonRaw from "../assets/unicode_latex_unicodemath.json";

const json = jsonRaw as [string, string, string][];
const input = ref("∀x ∈ ℝ, ∃y : x + y = 0\nα + β = γ\n∑ i = n(n+1)/2");
const copyBtnText = ref("Copy");

function replace(value: string) {
  let val = value;
  for (const [, char, latex] of json) {
    if (char !== "" && char.charCodeAt(0) > 127 && latex.length > 2) {
      val = val.replaceAll(char, `$${latex}$`);
    }
  }
  return val.replaceAll(/\$\$\$/g, "$");
}

const output = computed(() => replace(input.value));

const copyToClipboard = () => {
  navigator.clipboard.writeText(output.value).then(() => {
    copyBtnText.value = "Copied!";
    setTimeout(() => {
      copyBtnText.value = "Copy";
    }, 2000);
  });
};
</script>

<template>
  <div>
    <h2 class="display-6">Unicode → LaTeX</h2>
    <p class="text-muted mb-4">
      Convert Unicode mathematical characters to their corresponding LaTeX commands.
    </p>
    <div class="row">
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Unicode Input</div>
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
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold small text-uppercase text-muted">LaTeX Output</span>
            <button
              class="btn btn-sm btn-link p-0 text-decoration-none small"
              @click="copyToClipboard"
            >
              {{ copyBtnText }}
            </button>
          </div>
          <div class="card-body p-0">
            <textarea
              class="form-control border-0 font-monospace p-3 bg-light"
              :value="output"
              readonly
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
