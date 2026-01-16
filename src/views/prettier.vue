<template>
  <div>
      <ToolHeader
      title="Prettier"
      description="Format JSON, YAML, and code snippets instantly."
    />
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
          <div
            v-if="visibility.supportsSemicolons"
            class="col-lg-2 d-flex align-items-center gap-2 pt-lg-4"
          >
            <div class="form-check">
              <input v-model="useSemi" class="form-check-input" type="checkbox" id="useSemi" />
              <label class="form-check-label" for="useSemi">Semicolons</label>
            </div>
          </div>
          <div
            v-if="visibility.supportsSingleQuote"
            class="col-lg-2 d-flex align-items-center gap-2 pt-lg-4"
          >
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
          <div v-if="visibility.supportsTrailingComma" class="col-lg-3">
            <label class="form-label small fw-bold text-muted">Trailing Commas</label>
            <select v-model="trailingComma" class="form-select">
              <option value="es5">ES5</option>
              <option value="all">All</option>
              <option value="none">None</option>
            </select>
            <div class="form-text">Control where trailing commas are added.</div>
          </div>
          <div class="col-lg-12 text-end">
            <small class="text-muted">Formatting runs automatically as you edit.</small>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-6">
        <ToolCard title="Source Code" class="h-100" no-padding>
          <template #header-actions>
            <small class="text-muted">Paste any supported language</small>
          </template>
          <MonospaceEditor
            v-model="input"
            :language="currentLanguage"
            :rows="18"
            placeholder="Paste your code here..."
          />
        </ToolCard>
      </div>

      <div class="col-lg-6">
        <ToolCard title="Formatted Result" class="h-100" no-padding>
          <template #header-actions>
            <CopyButton :content="formatted" />
          </template>
          <div class="position-relative h-100">
            <LoadingOverlay :loading="isProcessing" message="Formatting..." />
            <MonospaceEditor
              :model-value="formatted"
              :language="currentLanguage"
              :rows="18"
              readonly
              bg-light
            />
          </div>
        </ToolCard>
        <div v-if="error" class="alert alert-warning mt-3 mb-0">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as Comlink from "comlink";
import { computed, onMounted, ref, watch } from "vue";
import CopyButton from "../components/CopyButton.vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import type { PrettierWorker } from "../workers/prettier-worker";

import PrettierWorkerConstructor from "../workers/prettier-worker?worker";

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
const selectedParser = ref<(typeof parserOptions)[number]["value"]>("babel");
const printWidth = ref(80);
const tabWidth = ref(2);
const useSemi = ref(true);
const singleQuote = ref(false);
const trailingComma = ref<"none" | "es5" | "all">("es5");
const error = ref("");
const isProcessing = ref(false);

const worker = ref<Comlink.Remote<PrettierWorker> | null>(null);

onMounted(() => {
	const w = new PrettierWorkerConstructor();
	worker.value = Comlink.wrap<PrettierWorker>(w);
});

const jsLikeParsers = new Set([
	"babel",
	"babel-ts",
	"typescript",
	"acorn",
	"flow",
	"meriyah",
]);
const cssParsers = new Set(["css", "scss", "less"]);
const singleQuoteFriendly = new Set([
	...jsLikeParsers,
	...cssParsers,
	"markdown",
	"mdx",
	"yaml",
]);

const currentLanguage = computed(() => {
	const parser = selectedParser.value;
	if (jsLikeParsers.has(parser)) {
		return parser.includes("ts") ? "typescript" : "javascript";
	}
	if (cssParsers.has(parser)) return parser;
	if (parser.startsWith("json")) return "json";
	if (["html", "angular", "vue"].includes(parser)) return "markup";
	if (["markdown", "mdx"].includes(parser)) return "markdown";
	if (parser === "yaml") return "yaml";
	if (parser === "graphql") return "graphql";
	if (parser === "glimmer") return "handlebars";
	return "markup";
});

const visibility = computed(() => ({
	supportsSemicolons: jsLikeParsers.has(selectedParser.value),
	supportsTrailingComma:
		jsLikeParsers.has(selectedParser.value) ||
		selectedParser.value === "graphql",
	supportsSingleQuote: singleQuoteFriendly.has(selectedParser.value),
}));

let formatRunId = 0;
const formatNow = async () => {
	const currentRun = ++formatRunId;

	if (!input.value) {
		formatted.value = "";
		error.value = "";
		return;
	}

	if (!worker.value) return;

	isProcessing.value = true;
	error.value = "";

	try {
		const result = await worker.value.format(input.value, {
			parser: selectedParser.value,
			semi: useSemi.value,
			singleQuote: singleQuote.value,
			tabWidth: tabWidth.value,
			printWidth: printWidth.value,
			trailingComma: trailingComma.value,
		});

		if (currentRun === formatRunId) {
			formatted.value = result;
		}
	} catch (err) {
		if (currentRun === formatRunId) {
			error.value =
				err instanceof Error ? err.message : "Failed to format code.";
		}
	} finally {
		if (currentRun === formatRunId) {
			isProcessing.value = false;
		}
	}
};

watch(
	[
		input,
		selectedParser,
		printWidth,
		tabWidth,
		useSemi,
		singleQuote,
		trailingComma,
		worker,
	],
	() => {
		void formatNow();
	},
	{ immediate: true },
);
</script>
