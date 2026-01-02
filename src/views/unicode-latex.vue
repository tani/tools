<script setup lang="ts">
import { computed, ref } from "vue";
import jsonRaw from "../assets/unicode_latex_unicodemath.json";
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import CopyButton from "../components/CopyButton.vue";

const json = jsonRaw as [string, string, string][];
const input = ref("∀x ∈ ℝ, ∃y : x + y = 0\nα + β = γ\n∑ i = n(n+1)/2");

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
</script>

<template>
  <div>
    <ToolHeader
      title="Unicode → LaTeX"
      description="Convert Unicode mathematical characters to their corresponding LaTeX commands."
    />
    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Unicode Input" no-padding>
          <MonospaceEditor v-model="input" />
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="LaTeX Output" no-padding>
          <template #header-actions>
            <CopyButton :content="output" />
          </template>
          <MonospaceEditor :model-value="output" readonly bg-light />
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
