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

type ConversionResult = {
	option: FormatOption;
	blobUrl: string;
	bytes: Uint8Array;
	size: number;
	width?: number;
	height?: number;
	pageCount?: number;
	isArchive?: boolean;
	downloadExtension?: string;
	previewLabel?: string;
};

const availableFormats: FormatOption[] = [
	{ label: "PNG", extension: "png", mimeType: "image/png" },
	{ label: "JPEG", extension: "jpg", mimeType: "image/jpeg" },
	{ label: "WebP", extension: "webp", mimeType: "image/webp" },
	{ label: "PDF", extension: "pdf", mimeType: "application/pdf" },
];

const targetFormat = ref<string>("image/png");
const quality = ref<number>(0.9);

const sourceBytes = ref<Uint8Array | null>(null);
const sourceMimeType = ref<string>("image/png");
const sourcePdfBytes = ref<Uint8Array | null>(null);
const sourcePreview = ref<string>("");
const sourceName = ref<string>("");
const sourceDetails = ref<{
	width: number;
	height: number;
} | null>(null);
const sourceError = ref("");

const converting = ref(false);
const result = ref<ConversionResult | null>(null);
const conversionError = ref("");

let muWorker: Worker | null = null;
let muApi: Comlink.Remote<PdfWorker> | null = null;

import PdfWorkerConstructor from "../workers/pdf-worker?worker";

onMounted(async () => {
	muWorker = new PdfWorkerConstructor();
	muApi = Comlink.wrap<PdfWorker>(muWorker);
});

const createImageBlob = async (
	width: number,
	height: number,
	pixels: Uint8ClampedArray,
	mimeType: string,
	qualityValue: number,
) => {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get canvas context");

	const imageData = new ImageData(pixels, width, height);
	ctx.putImageData(imageData, 0, 0);

	const blob = await new Promise<Blob | null>((resolve) => {
		ctx.canvas.toBlob((value) => resolve(value), mimeType, qualityValue);
	});
	if (!blob) throw new Error("Failed to create blob");
	return blob;
};

const makeCrc32Table = () => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let j = 0; j < 8; j++) {
			c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[i] = c >>> 0;
	}
	return table;
};

const crc32Table = makeCrc32Table();

const computeCrc32 = (bytes: Uint8Array) => {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
};

const createStoredZip = (
	entries: Array<{ name: string; bytes: Uint8Array }>,
) => {
	const encoder = new TextEncoder();
	const localParts: Uint8Array[] = [];
	const centralParts: Uint8Array[] = [];
	let offset = 0;

	for (const entry of entries) {
		const nameBytes = encoder.encode(entry.name);
		const crc = computeCrc32(entry.bytes);

		const localHeader = new Uint8Array(30 + nameBytes.length);
		const localView = new DataView(localHeader.buffer);
		localView.setUint32(0, 0x04034b50, true);
		localView.setUint16(4, 20, true);
		localView.setUint16(6, 0, true);
		localView.setUint16(8, 0, true);
		localView.setUint16(10, 0, true);
		localView.setUint16(12, 0, true);
		localView.setUint32(14, crc, true);
		localView.setUint32(18, entry.bytes.length, true);
		localView.setUint32(22, entry.bytes.length, true);
		localView.setUint16(26, nameBytes.length, true);
		localView.setUint16(28, 0, true);
		localHeader.set(nameBytes, 30);
		localParts.push(localHeader, entry.bytes);

		const centralHeader = new Uint8Array(46 + nameBytes.length);
		const centralView = new DataView(centralHeader.buffer);
		centralView.setUint32(0, 0x02014b50, true);
		centralView.setUint16(4, 20, true);
		centralView.setUint16(6, 20, true);
		centralView.setUint16(8, 0, true);
		centralView.setUint16(10, 0, true);
		centralView.setUint16(12, 0, true);
		centralView.setUint16(14, 0, true);
		centralView.setUint32(16, crc, true);
		centralView.setUint32(20, entry.bytes.length, true);
		centralView.setUint32(24, entry.bytes.length, true);
		centralView.setUint16(28, nameBytes.length, true);
		centralView.setUint16(30, 0, true);
		centralView.setUint16(32, 0, true);
		centralView.setUint16(34, 0, true);
		centralView.setUint16(36, 0, true);
		centralView.setUint32(38, 0, true);
		centralView.setUint32(42, offset, true);
		centralHeader.set(nameBytes, 46);
		centralParts.push(centralHeader);

		offset += localHeader.length + entry.bytes.length;
	}

	const centralDirectorySize = centralParts.reduce(
		(total, part) => total + part.length,
		0,
	);
	const endRecord = new Uint8Array(22);
	const endView = new DataView(endRecord.buffer);
	endView.setUint32(0, 0x06054b50, true);
	endView.setUint16(4, 0, true);
	endView.setUint16(6, 0, true);
	endView.setUint16(8, entries.length, true);
	endView.setUint16(10, entries.length, true);
	endView.setUint32(12, centralDirectorySize, true);
	endView.setUint32(16, offset, true);
	endView.setUint16(20, 0, true);

	const totalSize = offset + centralDirectorySize + endRecord.length;
	const zipBytes = new Uint8Array(totalSize);
	let writeOffset = 0;

	for (const part of [...localParts, ...centralParts, endRecord]) {
		zipBytes.set(part, writeOffset);
		writeOffset += part.length;
	}

	return zipBytes;
};

const getDownloadFileName = () => {
	if (!result.value) return "";
	const originalName = sourceName.value.replace(/\.[^.]+$/, "") || "converted";
	const extension =
		result.value.downloadExtension || result.value.option.extension;
	return `${originalName}.${extension}`;
};

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
		sourceMimeType.value = "image/png";
		sourcePdfBytes.value = buffer;
		try {
			processBuffer = await muApi.rasterizePdf(buffer);
		} catch (error) {
			sourceError.value =
				"Failed to rasterize PDF: " +
				(error instanceof Error ? error.message : String(error));
			return;
		}
	} else {
		sourceMimeType.value = file.type || "image/png";
	}
	sourceBytes.value = processBuffer;

	if (sourcePreview.value) URL.revokeObjectURL(sourcePreview.value);
	sourcePreview.value = URL.createObjectURL(
		new Blob([processBuffer as BlobPart], { type: sourceMimeType.value }),
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
		if (sourcePdfBytes.value && option.mimeType.startsWith("image/")) {
			if (!muApi) return;

			const pageCount = await muApi.getPageCount(sourcePdfBytes.value);
			const zipEntries: Array<{ name: string; bytes: Uint8Array }> = [];

			for (let i = 0; i < pageCount; i++) {
				const pageImage = await muApi.getPageAsImage(sourcePdfBytes.value, i);
				const blob = await createImageBlob(
					pageImage.width,
					pageImage.height,
					pageImage.pixels,
					option.mimeType,
					quality.value,
				);
				const bytes = new Uint8Array(await blob.arrayBuffer());
				zipEntries.push({
					name: `page-${String(i + 1).padStart(3, "0")}.${option.extension}`,
					bytes,
				});
			}

			const zipBytes = createStoredZip(zipEntries);
			if (result.value?.blobUrl) URL.revokeObjectURL(result.value.blobUrl);

			result.value = {
				option,
				blobUrl: URL.createObjectURL(
					new Blob([zipBytes as BlobPart], { type: "application/zip" }),
				),
				bytes: zipBytes,
				size: zipBytes.length,
				pageCount,
				isArchive: true,
				downloadExtension: "zip",
				previewLabel: `${pageCount} pages exported as ${option.label} images`,
			};
			return;
		}

		if (targetFormat.value === "application/pdf") {
			if (!muApi || !sourceBytes.value) return;
			const pdfBytes = await muApi.imageToPdf(
				sourceBytes.value,
				sourceMimeType.value,
			);

			if (result.value?.blobUrl) URL.revokeObjectURL(result.value.blobUrl);

			result.value = {
				option,
				blobUrl: URL.createObjectURL(
					new Blob([pdfBytes as BlobPart], { type: "application/pdf" }),
				),
				bytes: pdfBytes,
				width: sourceDetails.value?.width || 0,
				height: sourceDetails.value?.height || 0,
				size: pdfBytes.length,
			};
			return;
		}

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
      description="Convert images between popular formats and export PDF pages as a ZIP of images directly in the browser."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-md-6">
          <FilePicker label="Input Image or PDF" accept="image/*,application/pdf" @change="readFile" />
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
            <div v-else class="text-muted small">Upload an image or PDF to see preview</div>
          </div>
          <p v-if="sourceError" class="text-danger small mt-2 mb-0">{{ sourceError }}</p>
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Converted" class="h-100">
          <template #header-actions v-if="result">
            <DownloadLink
              :href="result.blobUrl"
              :filename="getDownloadFileName()"
            />
          </template>
          <div
            class="bg-light text-center p-3 d-flex align-items-center justify-content-center rounded"
            style="min-height: 300px"
          >
            <div v-if="result" class="w-100">
              <div
                v-if="result.isArchive"
                class="d-flex h-100 flex-column align-items-center justify-content-center py-5"
              >
                <div class="fw-semibold mb-2">ZIP archive ready</div>
                <div class="text-muted small">{{ result.previewLabel }}</div>
                <div class="text-muted small font-monospace mt-2">
                  {{ formatSize(result.size) }}
                </div>
              </div>
              <PdfViewer
                v-else-if="result.option.mimeType === 'application/pdf'"
                :data="result.bytes"
              />
              <img
                v-else
                :src="result.blobUrl"
                class="img-fluid mb-2 rounded shadow-sm"
                style="max-height: 400px"
              />
              <div v-if="!result.isArchive" class="text-muted small font-monospace mt-2">
                {{ result.width }} × {{ result.height }} px | {{ formatSize(result.size) }}
              </div>
            </div>
            <LoadingOverlay v-else-if="converting" :loading="converting" message="Converting..." />
            <div v-else class="text-muted small">Converted file will appear here</div>
          </div>
          <p v-if="conversionError" class="text-danger small mt-2 mb-0">{{ conversionError }}</p>
        </ToolCard>
      </div>
    </div>
  </div>
</template>
