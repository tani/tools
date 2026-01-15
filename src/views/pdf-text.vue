<script setup lang="ts">
import * as Comlink from "comlink";
import { onMounted, onUnmounted, ref } from "vue";
import CopyButton from "../components/CopyButton.vue";
import FilePicker from "../components/FilePicker.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import PdfViewer from "../components/PdfViewer.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import type { PdfWorker } from "../workers/pdf-worker";

const fileData = ref<Uint8Array | null>(null);
const fileName = ref<string | null>(null);
const resultText = ref("");
const isProcessing = ref(false);

let worker: Worker | null = null;
let api: Comlink.Remote<PdfWorker> | null = null;
const pdfWorkerUrl = new URL("../workers/pdf-worker.ts", import.meta.url);

onMounted(() => {
	worker = new Worker(pdfWorkerUrl, { type: "module" });
	api = Comlink.wrap<PdfWorker>(worker);
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
			resultText.value = "";
		};
		reader.readAsArrayBuffer(file);
	}
};

const extractText = async () => {
	if (!fileData.value || !api) return;

	isProcessing.value = true;
	resultText.value = "";

	try {
		const combinedText = await api.extractText(fileData.value);
		resultText.value = combinedText;
	} catch (error) {
		console.error("PDF Text Extraction Error:", error);
		alert("An error occurred while extracting text from the PDF.");
	} finally {
		isProcessing.value = false;
	}
};
</script>

<template>
  <div>
    <ToolHeader
      title="PDF → Text"
      description="Extract searchable text from PDF documents using MuPDF."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-md-9">
          <FilePicker label="Upload PDF" accept="application/pdf" @change="handleFileChange" />
        </div>
        <div class="col-md-3">
          <button
            class="btn btn-primary w-100"
            @click="extractText"
            :disabled="!fileData || isProcessing"
          >
            <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
            Extract Text
          </button>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <!-- Preview Area -->
      <div class="col-lg-6 mb-4">
        <ToolCard title="Source Preview" class="h-100" no-padding>
          <div class="overflow-auto" style="min-height: 500px; max-height: 800px">
            <PdfViewer :data="fileData" />
          </div>
        </ToolCard>
      </div>

      <!-- Result Area -->
      <div class="col-lg-6 mb-4">
        <ToolCard title="Extracted Text" class="h-100" no-padding>
          <template #header-actions>
            <CopyButton :content="resultText" />
          </template>
          <MonospaceEditor
            v-model="resultText"
            bg-light
            readonly
            placeholder="Extracted text will appear here..."
            style="min-height: 500px; height: 100%"
          />
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
