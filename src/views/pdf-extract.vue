<script setup lang="ts">
import * as Comlink from "comlink";
import { onMounted, onUnmounted, ref } from "vue";
import DownloadLink from "../components/DownloadLink.vue";
import FilePicker from "../components/FilePicker.vue";
import PdfViewer from "../components/PdfViewer.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import type { MupdfWorker } from "../workers/mupdf-worker";

const fileData = ref<Uint8Array | null>(null);
const fileName = ref<string | null>(null);
const pageRange = ref("1, 3, 5-7");
const isProcessing = ref(false);
const downloadUrl = ref<string | null>(null);

let worker: Worker | null = null;
let api: Comlink.Remote<MupdfWorker> | null = null;
const mupdfWorkerUrl = new URL("../workers/mupdf-worker.ts", import.meta.url);

onMounted(() => {
	worker = new Worker(mupdfWorkerUrl, { type: "module" });
	api = Comlink.wrap<MupdfWorker>(worker);
});

onUnmounted(() => {
	worker?.terminate();
});

const handleFileChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	if (file && file.type === "application/pdf") {
		fileName.value = file.name;
		const reader = new FileReader();
		reader.onload = (e) => {
			const arrayBuffer = e.target?.result as ArrayBuffer;
			fileData.value = new Uint8Array(arrayBuffer);
			downloadUrl.value = null;
		};
		reader.readAsArrayBuffer(file);
	}
};

const parsePageRanges = (rangeStr: string, maxPages: number): number[] => {
	const pages = new Set<number>();
	const parts = rangeStr.split(",");

	for (let part of parts) {
		part = part.trim();
		if (part.includes("-")) {
			const [start, end] = part.split("-").map((s) => parseInt(s.trim(), 10));
			if (!Number.isNaN(start) && !Number.isNaN(end)) {
				for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
					if (i > 0 && i <= maxPages) pages.add(i - 1); // 0-based index
				}
			}
		} else {
			const page = parseInt(part, 10);
			if (!Number.isNaN(page) && page > 0 && page <= maxPages) {
				pages.add(page - 1);
			}
		}
	}
	return Array.from(pages).sort((a, b) => a - b);
};

const extractPages = async () => {
	if (!fileData.value || !api) return;

	isProcessing.value = true;
	try {
		const totalPages = await api.getPageCount(fileData.value);
		const selectedIndices = parsePageRanges(pageRange.value, totalPages);

		if (selectedIndices.length === 0) {
			alert("Please enter valid page numbers.");
			return;
		}

		const result = await api.extractPages(fileData.value, selectedIndices);
		const blob = new Blob([result as BlobPart], { type: "application/pdf" });
		downloadUrl.value = URL.createObjectURL(blob);
	} catch (error) {
		console.error("PDF Extraction Error:", error);
		alert("An error occurred during extraction.");
	} finally {
		isProcessing.value = false;
	}
};
</script>

<template>
  <div>
    <ToolHeader
      title="PDF Extract"
      description="Extract specific pages or ranges from a PDF document into a new file."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-md-5">
          <FilePicker label="Upload PDF" accept="application/pdf" @change="handleFileChange" />
        </div>
        <div class="col-md-4">
          <label class="form-label fw-bold small">Page Ranges (e.g. 1, 3, 5-10)</label>
          <input
            v-model="pageRange"
            type="text"
            class="form-control font-monospace"
            placeholder="1, 2, 5-8"
            :disabled="!fileData"
          />
        </div>
        <div class="col-md-3">
          <button
            class="btn btn-primary w-100"
            @click="extractPages"
            :disabled="!fileData || isProcessing"
          >
            <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
            Extract Pages
          </button>
        </div>
      </div>
    </ToolCard>

    <div
      v-if="downloadUrl"
      class="alert alert-success d-flex justify-content-between align-items-center shadow-sm mb-4"
    >
      <span><strong>Success!</strong> Selected pages have been extracted.</span>
      <DownloadLink
        :href="downloadUrl"
        :filename="'extracted_' + fileName"
        label="Download Extracted PDF"
        class="btn btn-success btn-sm"
      />
    </div>

    <div class="row">
      <div class="col-12 mb-4">
        <ToolCard title="Source Document Preview" no-padding>
          <PdfViewer :data="fileData" />
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
