<script setup lang="ts">
import * as Comlink from "comlink";
import { Bash } from "just-bash";
import { onMounted, ref, watch } from "vue";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import type { OnigurumaWorker } from "../workers/oniguruma-worker";

import OnigurumaWorkerConstructor from "../workers/oniguruma-worker?worker";

const worker = ref<Comlink.Remote<OnigurumaWorker> | null>(null);
const isWorkerReady = ref(false);
let bash: Bash | null = null;

onMounted(() => {
	const w = new OnigurumaWorkerConstructor();
	worker.value = Comlink.wrap<OnigurumaWorker>(w);
	isWorkerReady.value = true;
	bash = new Bash();
	updateDiff();
});

const text = ref(
	"The year is 2025. The next year will be 2026. My favorite numbers are 7 and 42.",
);
const replaceText = ref("[year]");
const search = ref("\\d{4}");
const flags = ref("");

const result = ref("");
const error = ref<string | null>(null);
const isProcessing = ref(false);
const diffOutput = ref("");

watch(
	[text, replaceText, search, flags, isWorkerReady],
	async () => {
		if (!isWorkerReady.value || !worker.value) {
			result.value = text.value;
			return;
		}

		if (!search.value) {
			result.value = text.value;
			error.value = null;
			return;
		}

		isProcessing.value = true;
		try {
			const response = await worker.value.replace(
				text.value,
				search.value,
				replaceText.value,
				flags.value,
			);
			result.value = response.result;
			error.value = response.error || null;
		} catch (e) {
			error.value = String(e);
			result.value = text.value;
		} finally {
			isProcessing.value = false;
		}
	},
	{ immediate: true },
);

const updateDiff = async () => {
	if (!bash || !text.value || !result.value || text.value === result.value) {
		diffOutput.value = "";
		return;
	}

	try {
		await bash.writeFile("original.txt", text.value);
		await bash.writeFile("modified.txt", result.value);
		const res = await bash.exec("diff -u original.txt modified.txt");
		diffOutput.value = res.stdout;
	} catch (e) {
		console.error("Diff failed:", e);
		diffOutput.value = "";
	}
};

watch([text, result], updateDiff);
</script>

<template>
  <div>
    <ToolHeader
      title="Replace"
      description="Search and replace text using Oniguruma-style regular expressions with a side-by-side diff preview."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3">
        <div class="col-md-6">
          <label for="search" class="form-label fw-bold small">Oniguruma Pattern</label>
          <MonospaceEditor
            id="search"
            v-model="search"
            placeholder="e.g., \\d+"
            language="regex"
            single-line
          />
          <div class="form-text mt-0">
            Supports Oniguruma syntax like <span class="font-monospace">\\h</span> and inline
            modifiers.
          </div>
        </div>
        <div class="col-md-6">
          <label for="replace" class="form-label fw-bold small">Replacement Text</label>
          <MonospaceEditor
            id="replace"
            v-model="replaceText"
            placeholder="e.g., [number]"
            single-line
          />
          <div class="form-text mt-0">Supports <span class="font-monospace">$1</span>, <span class="font-monospace">$2</span>, etc. for groups.</div>
        </div>
        <div class="col-md-6">
          <label for="flags" class="form-label fw-bold small">Flags</label>
          <input
            id="flags"
            v-model="flags"
            class="form-control font-monospace"
            placeholder="i, m, x, D, S, W"
          />
          <div class="form-text">Oniguruma flags (passed as <span class="font-monospace">(?flags)pattern</span>).</div>
        </div>
        <div class="col-md-6">
          <label class="form-label fw-bold small">Preview</label>
          <div class="form-control font-monospace bg-light">
            {{
              search
                ? `/${search}/${flags}`
                : "—"
            }}
          </div>
        </div>
        <div v-if="!isWorkerReady" class="col-12">
          <div class="alert alert-info mb-0">Loading Oniguruma (WASM)...</div>
        </div>
        <div v-else-if="error" class="col-12">
          <div class="alert alert-danger mb-0">{{ error }}</div>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Input" class="h-100" no-padding>
          <MonospaceEditor v-model="text" :rows="20" />
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Output" class="h-100" no-padding>
          <template #header-actions>
            <CopyButton :content="result" />
          </template>
          <MonospaceEditor :model-value="result" bg-light readonly :rows="20" />
        </ToolCard>
      </div>
    </div>
    <div v-if="diffOutput" class="row">
      <div class="col-12 mb-4">
        <ToolCard title="Visual Diff" no-padding>
          <MonospaceEditor
            v-model="diffOutput"
            language="diff"
            readonly
            :rows="15"
            :bg-light="true"
          />
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
