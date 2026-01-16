<script setup lang="ts">
import * as Comlink from "comlink";
import { onMounted, onUnmounted, ref } from "vue";
import FilePicker from "../components/FilePicker.vue";
import PdfViewer from "../components/PdfViewer.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import type { PDFFont, PdfWorker } from "../workers/pdf-worker";

const fileData = ref<Uint8Array | null>(null);
const fileName = ref<string | null>(null);
const fontUsages = ref<PDFFont[]>([]);
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
			fontUsages.value = [];
		};
		reader.readAsArrayBuffer(file);
	}
};

const analyzeFonts = async () => {
	if (!fileData.value || !api) return;

	isProcessing.value = true;
	fontUsages.value = [];

	try {
		const result = await api.getFonts(fileData.value);
		fontUsages.value = [...result].sort((a, b) => a.name.localeCompare(b.name));
	} catch (error) {
		console.error("PDF Font Analysis Error:", error);
		alert("An error occurred while reading fonts from the PDF.");
	} finally {
		isProcessing.value = false;
	}
};
</script>

<template>
  <div>
    <ToolHeader
      title="PDF Font Inspector"
      description="List embedded fonts in a PDF document using MuPDF."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-md-8">
          <FilePicker label="Upload PDF" accept="application/pdf" @change="handleFileChange" />
        </div>
        <div class="col-md-4">
          <button
            class="btn btn-primary w-100"
            @click="analyzeFonts"
            :disabled="!fileData || isProcessing"
          >
            <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
            List Fonts
          </button>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Source Preview" class="h-100" no-padding>
          <div class="overflow-auto" style="min-height: 500px; max-height: 800px">
            <PdfViewer :data="fileData" />
          </div>
          <template #footer>
            <p class="mb-0 small text-muted">
              <span class="fw-bold">Selected file:</span>
              <span class="font-monospace">{{ fileName || "None" }}</span>
            </p>
          </template>
        </ToolCard>
      </div>

      <div class="col-lg-6 mb-4">
        <ToolCard title="Embedded Fonts" class="h-100">
          <div v-if="fontUsages.length === 0" class="alert alert-info mb-0">
            Upload a PDF and click <strong>List Fonts</strong> to inspect embedded font data.
          </div>
          <div v-else class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th scope="col">Font Name</th>
                  <th scope="col" class="text-center">Style</th>
                  <th scope="col" class="text-end">Occurrences</th>
                  <th scope="col" style="min-width: 160px">Pages</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="font in fontUsages" :key="font.name">
                  <td class="font-monospace">{{ font.name }}</td>
                  <td class="text-center">
                    <span v-if="font.isSerif" class="badge text-bg-primary rounded-pill me-1"
                      >Serif</span
                    >
                    <span v-if="font.isMono" class="badge text-bg-secondary rounded-pill me-1"
                      >Monospace</span
                    >
                    <span v-if="font.isBold" class="badge text-bg-dark rounded-pill me-1"
                      >Bold</span
                    >
                    <span v-if="font.isItalic" class="badge text-bg-info rounded-pill">Italic</span>
                    <span
                      v-if="!font.isSerif && !font.isMono && !font.isBold && !font.isItalic"
                      class="text-muted"
                      >Regular</span
                    >
                  </td>
                  <td class="text-end">
                    <span class="badge text-bg-light">{{ font.count.toLocaleString() }}</span>
                  </td>
                  <td class="font-monospace">
                    <span
                      v-for="(page, idx) in font.pages"
                      :key="page"
                      class="badge text-bg-light me-1 mb-1"
                    >
                      p.{{ page }}<span v-if="idx < font.pages.length - 1">,</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ToolCard>
      </div>
    </div>
  </div>
</template>
