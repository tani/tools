<script setup lang="ts">
import * as Comlink from "comlink";
import { computed, onMounted, ref, watch } from "vue";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import type { OnigurumaWorker } from "../workers/oniguruma-worker";

import OnigurumaWorkerConstructor from "../workers/oniguruma-worker?worker";

const worker = ref<Comlink.Remote<OnigurumaWorker> | null>(null);
const isWorkerReady = ref(false);

onMounted(() => {
	const w = new OnigurumaWorkerConstructor();
	worker.value = Comlink.wrap<OnigurumaWorker>(w);
	isWorkerReady.value = true;
});

type MatchSegment = { start: number; end: number; value: string };

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function buildHighlightedHtml(text: string, matches: MatchSegment[]): string {
	if (matches.length === 0) return escapeHtml(text);
	const fragments: string[] = [];
	let cursor = 0;
	for (const match of matches) {
		if (match.start > cursor)
			fragments.push(escapeHtml(text.slice(cursor, match.start)));
		fragments.push(
			`<mark style="border: 1px solid #000">${escapeHtml(text.slice(match.start, match.end))}</mark>`,
		);
		cursor = match.end;
	}
	if (cursor < text.length) fragments.push(escapeHtml(text.slice(cursor)));
	return fragments.join("");
}

const text = ref(
	"Oniguruma powers regex in Ruby, TextMate grammars, and many editors.\nTry patterns like \\h+, (?x) with comments, or Unicode classes like \\p{L}.\nFind hex: deadBEEF, cafe, 1234, and mix of words.",
);
const pattern = ref("\\b\\h+\\b");
const flags = ref("i");
const maxMatches = ref(500);

const matchesResult = ref<{ matches: MatchSegment[]; truncated: boolean }>({
	matches: [],
	truncated: false,
});
const error = ref<string | null>(null);
const isProcessing = ref(false);

watch(
	[pattern, flags, text, maxMatches, isWorkerReady],
	async () => {
		if (!isWorkerReady.value || !worker.value) return;
		if (!pattern.value.trim()) {
			matchesResult.value = { matches: [], truncated: false };
			error.value = null;
			return;
		}

		isProcessing.value = true;
		try {
			const result = await worker.value.findMatches(
				text.value,
				pattern.value,
				flags.value,
				maxMatches.value,
			);
			matchesResult.value = {
				matches: result.matches,
				truncated: result.truncated,
			};
			error.value = result.error || null;
		} catch (e) {
			error.value = String(e);
			matchesResult.value = { matches: [], truncated: false };
		} finally {
			isProcessing.value = false;
		}
	},
	{ immediate: true },
);

const highlightedHtml = computed(() =>
	buildHighlightedHtml(text.value, matchesResult.value.matches),
);

const matchList = computed(() =>
	matchesResult.value.matches
		.map((match) => (match.value === "" ? "(empty match)" : match.value))
		.join("\n"),
);

const matchSummary = computed(() => {
	if (!isWorkerReady.value) {
		return "Initializing worker...";
	}
	if (!pattern.value.trim()) {
		return "Enter a pattern";
	}
	if (isProcessing.value) {
		return "Processing...";
	}
	if (error.value) {
		return "Invalid pattern";
	}
	const count = matchesResult.value.matches.length;
	return matchesResult.value.truncated
		? `${count}+ matches (truncated)`
		: `${count} matches`;
});

const compiledPreview = computed(() => {
	if (!pattern.value.trim()) {
		return "";
	}
	return `/${pattern.value}/${flags.value}`;
});
</script>

<template>
  <div>
    <ToolHeader
      title="Regex"
      description="Highlight Oniguruma-style regex matches with an instant preview, powered by vscode-oniguruma."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3">
        <div class="col-12">
          <label for="pattern" class="form-label fw-bold small">Oniguruma Pattern</label>
          <MonospaceEditor
            id="pattern"
            v-model="pattern"
            placeholder="e.g., \\b\\h+\\b"
            language="regex"
            single-line
          />
          <div class="form-text mt-0">
            Supports Oniguruma syntax like <span class="font-monospace">\\h</span>,
            <span class="font-monospace">\\R</span>, and inline modifiers.
          </div>
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
          <div v-if="!isWorkerReady" class="alert alert-info mb-0">
            Loading Oniguruma (WASM)...
          </div>
          <div v-else-if="error" class="alert alert-danger mb-0">
            {{ error }}
          </div>
          <div v-else class="alert alert-secondary mb-0">
            <strong>Preview:</strong>
            <span class="font-monospace">{{ compiledPreview || "—" }}</span>
          </div>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Input Text" class="h-100" no-padding>
          <MonospaceEditor v-model="text" language="regex" :rows="18" />
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Matches Preview" class="h-100">
          <template #header-actions>
            <span class="small text-muted">{{ matchSummary }}</span>
          </template>
          <div class="font-monospace text-finder-output" v-html="highlightedHtml"></div>
        </ToolCard>
      </div>
    </div>

    <div class="row">
      <div class="col-12 mb-4">
        <ToolCard title="Matched Text" no-padding>
          <template #header-actions>
            <CopyButton :content="matchList" />
          </template>
          <MonospaceEditor :model-value="matchList" bg-light readonly :rows="8" />
        </ToolCard>
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
</style>
