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
import type { TesseractWorker } from "../workers/tesseract-worker";

const image = ref<string | null>(null);
const fileData = ref<Uint8Array | null>(null);
const fileType = ref<string | null>(null);
const result = ref("");
const progress = ref(0);
const status = ref("");
const isProcessing = ref(false);
const language = ref("eng");

const supportedLanguages = [
	{ code: "amh", name: "Amharic" },
	{ code: "ara", name: "Arabic" },
	{ code: "ben", name: "Bengali" },
	{ code: "mya", name: "Burmese" },
	{ code: "chi_sim", name: "Chinese - Simplified" },
	{ code: "ces", name: "Czech" },
	{ code: "dan", name: "Danish" },
	{ code: "nld", name: "Dutch" },
	{ code: "eng", name: "English" },
	{ code: "fas", name: "Persian" },
	{ code: "fin", name: "Finnish" },
	{ code: "fra", name: "French" },
	{ code: "deu", name: "German" },
	{ code: "ell", name: "Greek" },
	{ code: "guj", name: "Gujarati" },
	{ code: "heb", name: "Hebrew" },
	{ code: "hin", name: "Hindi" },
	{ code: "ind", name: "Indonesian" },
	{ code: "ita", name: "Italian" },
	{ code: "jpn", name: "Japanese" },
	{ code: "kan", name: "Kannada" },
	{ code: "khm", name: "Khmer" },
	{ code: "kor", name: "Korean" },
	{ code: "lao", name: "Lao" },
	{ code: "lat", name: "Latin" },
	{ code: "msa", name: "Malay" },
	{ code: "mal", name: "Malayalam" },
	{ code: "mar", name: "Marathi" },
	{ code: "nor", name: "Norwegian" },
	{ code: "pol", name: "Polish" },
	{ code: "por", name: "Portuguese" },
	{ code: "pan", name: "Punjabi" },
	{ code: "rus", name: "Russian" },
	{ code: "slk", name: "Slovak" },
	{ code: "spa", name: "Spanish" },
	{ code: "swa", name: "Swahili" },
	{ code: "swe", name: "Swedish" },
	{ code: "tgl", name: "Tagalog" },
	{ code: "tam", name: "Tamil" },
	{ code: "tel", name: "Telugu" },
	{ code: "tha", name: "Thai" },
	{ code: "tur", name: "Turkish" },
	{ code: "ukr", name: "Ukrainian" },
	{ code: "urd", name: "Urdu" },
	{ code: "vie", name: "Vietnamese" },
];

let tWorker: Worker | null = null;
let tApi: Comlink.Remote<TesseractWorker> | null = null;
let mWorker: Worker | null = null;
let mApi: Comlink.Remote<PdfWorker> | null = null;
const tesseractWorkerUrl = new URL(
	"../workers/tesseract-worker.ts",
	import.meta.url,
);
const pdfWorkerUrl = new URL("../workers/pdf-worker.ts", import.meta.url);

onMounted(() => {
	tWorker = new Worker(tesseractWorkerUrl, { type: "module" });
	tApi = Comlink.wrap<TesseractWorker>(tWorker);
	mWorker = new Worker(pdfWorkerUrl, { type: "module" });
	mApi = Comlink.wrap<PdfWorker>(mWorker);
});

onUnmounted(() => {
	tWorker?.terminate();
	mWorker?.terminate();
});

const calculatePdfProgress = (
	currentPage: number,
	totalPages: number,
	pageProgress: number,
) => {
	if (totalPages <= 0) return 0;
	return (currentPage + pageProgress) / totalPages;
};

const formatOcrResult = (pages: { pageNumber: number; text: string }[]) => {
	return pages
		.map((p) => `--- Page ${p.pageNumber} ---\n${p.text}\n\n`)
		.join("")
		.trim();
};

const handleFileChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	if (file) {
		fileType.value = file.type;
		const reader = new FileReader();
		reader.onload = (e) => {
			const arrayBuffer = e.target?.result as ArrayBuffer;
			fileData.value = new Uint8Array(arrayBuffer);

			if (file.type === "application/pdf") {
				image.value = null;
				status.value = "PDF Loaded. Ready to recognize.";
			} else {
				const blob = new Blob([fileData.value as BlobPart], {
					type: file.type,
				});
				image.value = URL.createObjectURL(blob);
				status.value = "Image Loaded. Ready to recognize.";
			}
			result.value = "";
			progress.value = 0;
		};
		reader.readAsArrayBuffer(file);
	}
};

const recognizeText = async () => {
	if (!fileData.value || !tApi || !mApi) return;

	isProcessing.value = true;
	result.value = "";
	progress.value = 0;
	status.value = "Initializing...";

	try {
		if (fileType.value === "application/pdf") {
			const totalPages = await mApi.getPageCount(fileData.value);
			const pages: { pageNumber: number; text: string }[] = [];

			for (let i = 0; i < totalPages; i++) {
				status.value = `Processing PDF page ${i + 1} of ${totalPages}...`;
				const pageImg = await mApi.getPageAsImage(fileData.value, i);

				const canvas = document.createElement("canvas");
				canvas.width = pageImg.width;
				canvas.height = pageImg.height;
				const ctx = canvas.getContext("2d");
				if (!ctx) continue;
				const imageData = new ImageData(
					new Uint8ClampedArray(pageImg.pixels),
					pageImg.width,
					pageImg.height,
				);
				ctx.putImageData(imageData, 0, 0);
				const dataUrl = canvas.toDataURL("image/png");

				const text = await tApi.recognize(
					dataUrl,
					language.value,
					Comlink.proxy((m: { status: string; progress: number }) => {
						if (m.status === "recognizing text") {
							progress.value = calculatePdfProgress(i, totalPages, m.progress);
						}
					}),
				);

				pages.push({ pageNumber: i + 1, text });
			}
			result.value = formatOcrResult(pages);
		} else {
			const currentImage = image.value;
			if (currentImage) {
				const text = await tApi.recognize(
					currentImage,
					language.value,
					Comlink.proxy((m: { status: string; progress: number }) => {
						if (m.status === "recognizing text") {
							progress.value = m.progress;
						}
						status.value = m.status;
					}),
				);
				result.value = text;
			}
		}
		status.value = "Recognition complete";
		progress.value = 1;
	} catch (error) {
		console.error("OCR Error:", error);
		status.value = "Error occurred during recognition";
	} finally {
		isProcessing.value = false;
	}
};
</script>

<template>
  <div>
    <ToolHeader
      title="OCR"
      description="Extract text from images or PDF documents using Optical Character Recognition (OCR) powered by Tesseract.js and MuPDF."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-md-4">
          <label class="form-label fw-bold small">Language</label>
          <select v-model="language" class="form-select">
            <option v-for="lang in supportedLanguages" :key="lang.code" :value="lang.code">
              {{ lang.name }}
            </option>
          </select>
        </div>
        <div class="col-md-5">
          <FilePicker
            label="Upload Image or PDF"
            accept="image/*,application/pdf"
            @change="handleFileChange"
          />
        </div>
        <div class="col-md-3">
          <button
            class="btn btn-primary w-100"
            type="button"
            @click="recognizeText"
            :disabled="!fileData || isProcessing"
          >
            <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
            {{ isProcessing ? "Processing..." : "Start OCR" }}
          </button>
        </div>
      </div>
      <div v-if="isProcessing || progress > 0" class="mt-3">
        <div class="d-flex justify-content-between mb-1">
          <span class="small text-muted text-uppercase fw-bold">{{ status }}</span>
          <span class="small text-muted">{{ Math.round(progress * 100) }}%</span>
        </div>
        <div class="progress" style="height: 10px">
          <div
            class="progress-bar"
            role="progressbar"
            :class="{
              'progress-bar-striped progress-bar-animated': isProcessing,
              'bg-success': status === 'Recognition complete',
            }"
            :style="{ width: `${progress * 100}%` }"
          ></div>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Source Preview" class="h-100" no-padding>
          <div
            class="bg-light overflow-auto p-0 d-flex align-items-center justify-content-center"
            style="min-height: 400px"
          >
            <div v-if="image" class="p-3">
              <img :src="image" class="img-fluid border shadow-sm" alt="OCR Source" />
            </div>
            <PdfViewer v-else-if="fileType === 'application/pdf'" :data="fileData" />
            <div v-else class="text-muted small">No file uploaded</div>
          </div>
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Extracted Text" class="h-100" no-padding>
          <template #header-actions>
            <CopyButton :content="result" />
          </template>
          <div class="d-flex flex-column h-100">
            <MonospaceEditor
              v-model="result"
              bg-light
              readonly
              placeholder="Extracted text will appear here..."
              style="min-height: 400px"
              class="flex-grow-1"
            />
          </div>
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
