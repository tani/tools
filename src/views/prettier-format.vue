<template>
  <div>
    <h2 class="display-6">Prettier Formatter</h2>
    <p class="text-muted">
      Format code from any supported language using Prettier's built-in plugins.
    </p>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-lg-4">
            <label class="form-label small fw-bold text-muted">Parser</label>
            <select v-model="selectedParser" class="form-select">
              <option v-for="option in parserOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <div class="form-text">
              Choose a parser that matches the language you want to format.
            </div>
          </div>
          <div class="col-lg-2">
            <label class="form-label small fw-bold text-muted">Print Width</label>
            <input
              v-model.number="printWidth"
              type="number"
              min="40"
              max="200"
              class="form-control"
            />
            <div class="form-text">Maximum line width.</div>
          </div>
          <div class="col-lg-2">
            <label class="form-label small fw-bold text-muted">Tab Width</label>
            <input v-model.number="tabWidth" type="number" min="1" max="8" class="form-control" />
            <div class="form-text">Spaces per indentation level.</div>
          </div>
          <div class="col-lg-2 d-flex align-items-center gap-2 pt-lg-4">
            <div class="form-check">
              <input v-model="useSemi" class="form-check-input" type="checkbox" id="useSemi" />
              <label class="form-check-label" for="useSemi">Semicolons</label>
            </div>
          </div>
          <div class="col-lg-2 d-flex align-items-center gap-2 pt-lg-4">
            <div class="form-check">
              <input
                v-model="singleQuote"
                class="form-check-input"
                type="checkbox"
                id="singleQuote"
              />
              <label class="form-check-label" for="singleQuote">Single quotes</label>
            </div>
          </div>
          <div class="col-lg-3">
            <label class="form-label small fw-bold text-muted">Trailing Commas</label>
            <select v-model="trailingComma" class="form-select">
              <option value="es5">ES5</option>
              <option value="all">All</option>
              <option value="none">None</option>
            </select>
            <div class="form-text">Control where trailing commas are added.</div>
          </div>
          <div class="col-lg-9 d-flex align-items-end justify-content-end">
            <button class="btn btn-primary" type="button" @click="formatNow">Format</button>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-6">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold">Source Code</span>
            <small class="text-muted">Paste any supported language</small>
          </div>
          <div class="card-body">
            <textarea
              v-model="input"
              class="form-control font-monospace"
              rows="18"
              placeholder="Paste your code here..."
            ></textarea>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold">Formatted Result</span>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-secondary" type="button" @click="copyOutput">
                Copy
              </button>
            </div>
          </div>
          <div class="card-body">
            <textarea
              v-model="formatted"
              class="form-control font-monospace bg-light"
              rows="18"
              readonly
            ></textarea>
            <div v-if="error" class="alert alert-warning mt-3 mb-0">{{ error }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import prettier from "prettier/standalone";
import pluginAcorn from "prettier/plugins/acorn";
import pluginAngular from "prettier/plugins/angular";
import pluginBabel from "prettier/plugins/babel";
import pluginEstree from "prettier/plugins/estree";
import pluginFlow from "prettier/plugins/flow";
import pluginGlimmer from "prettier/plugins/glimmer";
import pluginGraphql from "prettier/plugins/graphql";
import pluginHtml from "prettier/plugins/html";
import pluginMarkdown from "prettier/plugins/markdown";
import pluginMeriyah from "prettier/plugins/meriyah";
import pluginPostcss from "prettier/plugins/postcss";
import pluginTypeScript from "prettier/plugins/typescript";
import pluginYaml from "prettier/plugins/yaml";

const parserOptions = [
  { value: "babel", label: "JavaScript (Babel)" },
  { value: "babel-ts", label: "TypeScript (via Babel)" },
  { value: "typescript", label: "TypeScript" },
  { value: "acorn", label: "JavaScript (Acorn)" },
  { value: "flow", label: "Flow" },
  { value: "meriyah", label: "Meriyah" },
  { value: "json", label: "JSON" },
  { value: "json5", label: "JSON5" },
  { value: "json-stringify", label: "JSON Stringify" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "less", label: "Less" },
  { value: "html", label: "HTML" },
  { value: "angular", label: "Angular" },
  { value: "vue", label: "Vue" },
  { value: "markdown", label: "Markdown" },
  { value: "mdx", label: "MDX" },
  { value: "graphql", label: "GraphQL" },
  { value: "yaml", label: "YAML" },
  { value: "glimmer", label: "Handlebars / Glimmer" },
] as const;

const input = ref(`function greet(name){console.log("Hello, " + name + "!")}`);
const formatted = ref("");
const selectedParser = ref<typeof parserOptions[number]["value"]>("babel");
const printWidth = ref(80);
const tabWidth = ref(2);
const useSemi = ref(true);
const singleQuote = ref(false);
const trailingComma = ref<"none" | "es5" | "all">("es5");
const error = ref("");

const plugins = [
  pluginAcorn,
  pluginAngular,
  pluginBabel,
  pluginEstree,
  pluginFlow,
  pluginGlimmer,
  pluginGraphql,
  pluginHtml,
  pluginMarkdown,
  pluginMeriyah,
  pluginPostcss,
  pluginTypeScript,
  pluginYaml,
];

const formatNow = async () => {
  error.value = "";
  try {
    formatted.value = await prettier.format(input.value, {
      parser: selectedParser.value,
      plugins,
      semi: useSemi.value,
      singleQuote: singleQuote.value,
      tabWidth: tabWidth.value,
      printWidth: printWidth.value,
      trailingComma: trailingComma.value,
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to format code.";
  }
};

const copyOutput = async () => {
  if (!formatted.value) return;
  await navigator.clipboard.writeText(formatted.value);
};

formatNow();
</script>
