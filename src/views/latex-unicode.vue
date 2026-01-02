<script setup lang="ts">
import { computed, ref } from "vue";
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import jsonRaw from "../assets/unicode_latex_unicodemath.json";
import subscriptSuperscriptRaw from "../assets/subscript_superscript.json";

const json = jsonRaw as [string, string, string][];
const subscript = subscriptSuperscriptRaw.subscript as Record<string, string>;
const superscript = subscriptSuperscriptRaw.superscript as Record<string, string>;
const input = ref("E = mc^2\n\\alpha^2 + \\beta^2 = \\gamma^2\nx_{i+1} = x_i + \\Delta x");

function replace(value: string) {
  let val = value;
  for (const [, char, latex] of json) {
    if (char !== "" && char.charCodeAt(0) > 127 && latex.length > 2) {
      val = val.replaceAll(new RegExp(`\\${latex}(?![a-zA-Z])`, "g"), char);
    }
  }
  val = val
    .replaceAll(/_\{(.*?)\}/g, (_, sub: string) => sub.replaceAll(/./g, (s) => subscript[s] ?? s))
    .replaceAll(/\^\{(.*?)\}/g, (_, sub: string) =>
      sub.replaceAll(/./g, (s) => superscript[s] ?? s),
    )
    .replaceAll(/_(.)/g, (_, sub: string) => subscript[sub] ?? sub)
    .replaceAll(/\^(.)/g, (_, sup: string) => superscript[sup] ?? sup);
  return val.replaceAll(/\$(.*?)\$/g, "$1");
}

const output = computed(() => replace(input.value));
</script>

<template>
  <div>
    <ToolHeader
      title="LaTeX → Unicode"
      description="Convert LaTeX mathematical symbols and expressions to their Unicode equivalents."
    />

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="LaTeX Input" class="h-100" no-padding>
          <MonospaceEditor v-model="input" :rows="20" />
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Unicode Output" class="h-100" no-padding>
          <template #header-actions>
            <CopyButton :content="output" />
          </template>
          <MonospaceEditor :model-value="output" bg-light readonly :rows="20" />
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
