<script setup lang="ts">
import { computed, ref, watch } from "vue";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import prettier from "prettier/standalone";
import angular from "prettier/plugins/angular";
import babel from "prettier/plugins/babel";
import estree from "prettier/plugins/estree";
import flow from "prettier/plugins/flow";
import glimmer from "prettier/plugins/glimmer";
import graphql from "prettier/plugins/graphql";
import html from "prettier/plugins/html";
import markdown from "prettier/plugins/markdown";
import meriyah from "prettier/plugins/meriyah";
import postcss from "prettier/plugins/postcss";
import typescript from "prettier/plugins/typescript";
import yaml from "prettier/plugins/yaml";
import type { Plugin } from "prettier";

const code = ref(
  `function sayHello(name) {
console.log('Hello, ' + name)
}

const user = {name: 'Taniguchi', tools: ['regex', 'pdf']}

sayHello(user.name)
`,
);
const filePath = ref("sample.js");
const printWidth = ref(80);
const tabWidth = ref(2);
const useTabs = ref(false);
const semi = ref(true);
const singleQuote = ref(false);
const trailingComma = ref<"none" | "es5" | "all">("es5");
const proseWrap = ref<"preserve" | "always" | "never">("preserve");

const plugins = [
  angular,
  babel,
  estree,
  flow,
  glimmer,
  graphql,
  html,
  markdown,
  meriyah,
  postcss,
  typescript,
  yaml,
] as Plugin[];

const formattedOutput = ref(code.value);
const formatError = ref<string | null>(null);

watch(
  [code, filePath, printWidth, tabWidth, useTabs, semi, singleQuote, trailingComma, proseWrap],
  async () => {
    try {
      formatError.value = null;
      formattedOutput.value = await prettier.format(code.value, {
        filepath: filePath.value || "file.txt",
        printWidth: printWidth.value,
        tabWidth: tabWidth.value,
        useTabs: useTabs.value,
        semi: semi.value,
        singleQuote: singleQuote.value,
        trailingComma: trailingComma.value,
        proseWrap: proseWrap.value,
        plugins,
      });
    } catch (err) {
      formatError.value = err instanceof Error ? err.message : String(err);
      formattedOutput.value = code.value;
    }
  },
  { immediate: true },
);

const pluginSummary = computed(
  () =>
    [
      "JavaScript/JSX (Babel/Meriyah)",
      "TypeScript/TSX",
      "Flow",
      "HTML/Vue/Angular/Glimmer",
      "CSS/SCSS/LESS (PostCSS)",
      "GraphQL",
      "Markdown/MDX",
      "YAML",
    ].join(" • "),
);
</script>

<template>
  <div>
    <ToolHeader
      title="Prettier Formatter"
      description="Format source code in dozens of languages using Prettier's built-in plugins and customizable options."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3">
        <div class="col-md-6">
          <label for="filepath" class="form-label fw-bold small">File path hint</label>
          <input
            id="filepath"
            v-model="filePath"
            class="form-control font-monospace"
            placeholder="example.tsx or component.vue"
          />
          <div class="form-text">Used to auto-select the parser and language-specific rules.</div>
        </div>
        <div class="col-md-3">
          <label for="printWidth" class="form-label fw-bold small">Print width</label>
          <input id="printWidth" v-model.number="printWidth" type="number" min="40" max="200" class="form-control" />
        </div>
        <div class="col-md-3">
          <label for="tabWidth" class="form-label fw-bold small">Tab width</label>
          <input id="tabWidth" v-model.number="tabWidth" type="number" min="1" max="8" class="form-control" />
        </div>
        <div class="col-md-3">
          <div class="form-label fw-bold small">Tabs or spaces</div>
          <div class="form-check">
            <input id="spaces" v-model="useTabs" class="form-check-input" type="radio" :value="false" />
            <label for="spaces" class="form-check-label">Spaces</label>
          </div>
          <div class="form-check">
            <input id="tabs" v-model="useTabs" class="form-check-input" type="radio" :value="true" />
            <label for="tabs" class="form-check-label">Tabs</label>
          </div>
        </div>
        <div class="col-md-3">
          <div class="form-label fw-bold small">Semicolons</div>
          <div class="form-check">
            <input id="semiOn" v-model="semi" class="form-check-input" type="radio" :value="true" />
            <label for="semiOn" class="form-check-label">Keep semicolons</label>
          </div>
          <div class="form-check">
            <input id="semiOff" v-model="semi" class="form-check-input" type="radio" :value="false" />
            <label for="semiOff" class="form-check-label">Omit where possible</label>
          </div>
        </div>
        <div class="col-md-3">
          <div class="form-label fw-bold small">Quotes</div>
          <div class="form-check">
            <input id="doubleQuotes" v-model="singleQuote" class="form-check-input" type="radio" :value="false" />
            <label for="doubleQuotes" class="form-check-label">Double quotes</label>
          </div>
          <div class="form-check">
            <input id="singleQuotes" v-model="singleQuote" class="form-check-input" type="radio" :value="true" />
            <label for="singleQuotes" class="form-check-label">Single quotes</label>
          </div>
        </div>
        <div class="col-md-3">
          <label class="form-label fw-bold small" for="trailingComma">Trailing commas</label>
          <select id="trailingComma" v-model="trailingComma" class="form-select">
            <option value="none">None</option>
            <option value="es5">ES5</option>
            <option value="all">All</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label fw-bold small" for="proseWrap">Prose wrapping</label>
          <select id="proseWrap" v-model="proseWrap" class="form-select">
            <option value="preserve">Preserve</option>
            <option value="always">Always</option>
            <option value="never">Never</option>
          </select>
        </div>
        <div class="col-12">
          <div class="alert alert-light mb-0">
            Preloaded plugins: {{ pluginSummary }}. Point the file path to your language (e.g., <span class="font-monospace">main.py</span>,
            <span class="font-monospace">App.vue</span>, <span class="font-monospace">document.md</span>) and Prettier will pick the best parser.
          </div>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Input" class="h-100" no-padding>
          <MonospaceEditor v-model="code" :rows="18" />
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Formatted" class="h-100" no-padding>
          <template #header-actions>
            <CopyButton :content="formattedOutput" />
          </template>
          <MonospaceEditor :model-value="formattedOutput" bg-light readonly :rows="18" />
        </ToolCard>
      </div>
    </div>

    <div v-if="formatError" class="row">
      <div class="col-12 mb-4">
        <div class="alert alert-danger mb-0 font-monospace">{{ formatError }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-monospace {
  font-family: var(--bs-font-monospace);
}
</style>
