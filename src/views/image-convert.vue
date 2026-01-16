<script setup lang="ts">
import * as Comlink from "comlink";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import DownloadLink from "../components/DownloadLink.vue";
import FilePicker from "../components/FilePicker.vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";
import PdfViewer from "../components/PdfViewer.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import type { PdfWorker } from "../workers/pdf-worker";

export type FormatOption = {
	label: string;
	extension: string;
	mimeType: string;
};

const availableFormats: FormatOption[] = [
	{ label: "PNG", extension: "png", mimeType: "image/png" },
	{ label: "JPEG", extension: "jpg", mimeType: "image/jpeg" },
	{ label: "WebP", extension: "webp", mimeType: "image/webp" },
];

const targetFormat = ref<string>("image/png");
const quality = ref<number>(0.9);

const sourceBytes = ref<Uint8Array | null>(null);
const sourcePdfBytes = ref<Uint8Array | null>(null);
const sourcePreview = ref<string>("");
const sourceName = ref<string>("");
const sourceDetails = ref<{
	width: number;
	height: number;
} | null>(null);
const sourceError = ref("");

const converting = ref(false);
const result = ref<{
	option: FormatOption;
	blobUrl: string;
	bytes: Uint8Array;
	width: number;
	height: number;
	size: number;
} | null>(null);
const conversionError = ref("");

let muWorker: Worker | null = null;
let muApi: Comlink.Remote<PdfWorker> | null = null;

import PdfWorkerConstructor from "../workers/pdf-worker?worker";

onMounted(async () => {
	muWorker = new PdfWorkerConstructor();
	muApi = Comlink.wrap<PdfWorker>(muWorker);
});

const readFile = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	if (!file || !muApi) return;

	sourceError.value = "";
	if (result.value?.blobUrl) URL.revokeObjectURL(result.value.blobUrl);
	result.value = null;

	const buffer = new Uint8Array(await file.arrayBuffer());
	sourceName.value = file.name;
	sourcePdfBytes.value = null;

	let processBuffer: Uint8Array = buffer;
	if (
		file.type === "application/pdf" ||
		file.name.toLowerCase().endsWith(".pdf")
	) {
		sourcePdfBytes.value = buffer;
		try {
			processBuffer = await muApi.rasterizePdf(buffer);
		} catch (error) {
			sourceError.value =
				"Failed to rasterize PDF: " +
				(error instanceof Error ? error.message : String(error));
			return;
		}
	}
	sourceBytes.value = processBuffer;

	if (sourcePreview.value) URL.revokeObjectURL(sourcePreview.value);
	sourcePreview.value = URL.createObjectURL(
		new Blob([processBuffer as BlobPart], { type: file.type || "image/png" }),
	);

	const img = new Image();
	img.onload = () => {
		sourceDetails.value = {
			width: img.width,
			height: img.height,
		};
	};
	img.onerror = () => {
		sourceDetails.value = null;
		sourceError.value = "Unable to read the image.";
	};
	img.src = sourcePreview.value;
};

const convert = async () => {
	if (!sourcePreview.value || !targetFormat.value) return;
	converting.value = true;
	conversionError.value = "";

	const option = availableFormats.find(
		(f) => f.mimeType === targetFormat.value,
	);
	if (!option) {
		converting.value = false;
		return;
	}

	try {
		const img = new Image();
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
			img.src = sourcePreview.value;
		});

		const canvas = document.createElement("canvas");
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Failed to get canvas context");

		ctx.drawImage(img, 0, 0);

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob((b) => resolve(b), option.mimeType, quality.value);
		});

		if (!blob) throw new Error("Failed to create blob");

		if (result.value?.blobUrl) URL.revokeObjectURL(result.value.blobUrl);

		const convertedBytes = new Uint8Array(await blob.arrayBuffer());
		result.value = {
			option,
			blobUrl: URL.createObjectURL(blob),
			bytes: convertedBytes,
			width: canvas.width,
			height: canvas.height,
			size: blob.size,
		};
	} catch (error) {
		conversionError.value =
			error instanceof Error ? error.message : "Conversion failed.";
	} finally {
		converting.value = false;
	}
};

let debounceTimeout: number | null = null;
watch(
	[sourcePreview, targetFormat, quality],
	() => {
		if (debounceTimeout) clearTimeout(debounceTimeout);
		debounceTimeout = window.setTimeout(
			() => {
				convert();
			},
			250, // Debounce for 250ms
		);
	},
	{ immediate: false },
);
onBeforeUnmount(() => {
	if (sourcePreview.value) URL.revokeObjectURL(sourcePreview.value);
	if (result.value?.blobUrl) URL.revokeObjectURL(result.value.blobUrl);
	muWorker?.terminate();
});

const formatSize = (bytes: number) => {
	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}
	return `${size.toFixed(1)} ${units[unitIndex]}`;
};
</script>

<template>
  <div class="container py-4">
    <ToolHeader
      title="Image Convert"
      description="Convert images between popular formats like PNG, JPEG, and WebP using the browser's Canvas API."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-md-6">
          <FilePicker label="Input Image" accept="image/*,application/pdf" @change="readFile" />
        </div>
        <div class="col-md-3">
          <label class="form-label fw-bold small">Target Format</label>
          <select
            v-model="targetFormat"
            class="form-select"
            :disabled="converting"
          >
            <option v-for="option in availableFormats" :key="option.mimeType" :value="option.mimeType">
              {{ option.label }} (.{{ option.extension }})
            </option>
          </select>
        </div>
        <div class="col-md-3" v-if="targetFormat === 'image/jpeg' || targetFormat === 'image/webp'">
          <label class="form-label fw-bold small">Quality ({{ (quality * 100).toFixed(0) }}%)</label>
          <input
            type="range"
            class="form-range"
            min="0"
            max="1"
            step="0.01"
            v-model.number="quality"
          />
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Original" class="h-100">
          <div
            class="bg-light text-center p-3 d-flex align-items-center justify-content-center rounded"
            style="min-height: 300px"
          >
            <div v-if="sourcePreview" class="w-100">
              <PdfViewer v-if="sourcePdfBytes" :data="sourcePdfBytes" />
              <template v-else>
                <img
                  :src="sourcePreview"
                  class="img-fluid mb-2 rounded shadow-sm"
                  style="max-height: 400px"
                />
              </template>
              <div v-if="sourceDetails" class="text-muted small font-monospace mt-2">
                {{ sourceDetails.width }} × {{ sourceDetails.height }} px |
                {{ formatSize(sourceBytes?.length || 0) }}
              </div>
            </div>
            <div v-else class="text-muted small">Upload an image to see preview</div>
          </div>
          <p v-if="sourceError" class="text-danger small mt-2 mb-0">{{ sourceError }}</p>
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Converted" class="h-100">
          <template #header-actions v-if="result">
            <DownloadLink
              :href="result.blobUrl"
              :filename="`converted.${result.option.extension}`"
            />
          </template>
          <div
            class="bg-light text-center p-3 d-flex align-items-center justify-content-center rounded"
            style="min-height: 300px"
          >
            <div v-if="result" class="w-100">
              <img
                :src="result.blobUrl"
                class="img-fluid mb-2 rounded shadow-sm"
                style="max-height: 400px"
              />
              <div class="text-muted small font-monospace mt-2">
                {{ result.width }} × {{ result.height }} px | {{ formatSize(result.size) }}
              </div>
            </div>
            <LoadingOverlay v-else-if="converting" :loading="converting" message="Converting..." />
            <div v-else class="text-muted small">Converted image will appear here</div>
          </div>
          <p v-if="conversionError" class="text-danger small mt-2 mb-0">{{ conversionError }}</p>
        </ToolCard>
      </div>
    </div>
  </div>
</template>
