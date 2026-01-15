<script setup lang="ts">
import * as Comlink from "comlink";
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { MupdfWorker } from "../workers/mupdf-worker";
import LoadingOverlay from "./LoadingOverlay.vue";

const props = defineProps<{
	data: Uint8Array | null;
}>();

const pages = ref<string[]>([]);
const isRendering = ref(false);
const error = ref<string | null>(null);

let worker: Worker | null = null;
let api: Comlink.Remote<MupdfWorker> | null = null;
const mupdfWorkerUrl = new URL("../workers/mupdf-worker.ts", import.meta.url);

onMounted(() => {
	worker = new Worker(mupdfWorkerUrl, { type: "module" });
	api = Comlink.wrap<MupdfWorker>(worker);
	if (props.data) renderPdf();
});

onUnmounted(() => {
	worker?.terminate();
});

const renderPdf = async () => {
	if (!props.data || !api) {
		pages.value = [];
		return;
	}

	isRendering.value = true;
	error.value = null;
	pages.value = [];

	try {
		// We use a scale of 1.5 for a balance between performance and readability
		const thumbs = await api.renderThumbnails(props.data, 1.5);
		const renderedPages: string[] = [];

		for (const thumb of thumbs) {
			const canvas = document.createElement("canvas");
			canvas.width = thumb.width;
			canvas.height = thumb.height;
			const ctx = canvas.getContext("2d");

			if (ctx) {
				const samples = new Uint8ClampedArray(thumb.pixels);
				const imageData = new ImageData(samples, thumb.width, thumb.height);
				ctx.putImageData(imageData, 0, 0);
				renderedPages.push(canvas.toDataURL());
			}
		}

		pages.value = renderedPages;
	} catch (err) {
		console.error("PDF Rendering Error:", err);
		error.value = "Failed to render PDF document.";
	} finally {
		isRendering.value = false;
	}
};

watch(() => props.data, renderPdf);
</script>

<template>
  <div
    class="pdf-viewer-container bg-secondary bg-opacity-10 p-3 rounded overflow-auto"
    style="max-height: 800px"
  >
    <LoadingOverlay :loading="isRendering" message="Rendering Document..." />

    <div v-if="error && !isRendering" class="alert alert-danger m-0">
      {{ error }}
    </div>

    <div v-else-if="pages.length > 0" class="d-flex flex-column gap-3 align-items-center">
      <div
        v-for="(page, index) in pages"
        :key="index"
        class="pdf-page shadow-sm bg-white p-1 position-relative"
      >
        <img :src="page" class="img-fluid border" :alt="'Page ' + (index + 1)" />
        <span class="badge bg-dark position-absolute top-0 start-0 m-2 opacity-50"
          >Page {{ index + 1 }}</span
        >
      </div>
    </div>

    <div v-else class="text-center py-5 text-muted small uppercase fw-bold">No document loaded</div>
  </div>
</template>

<style scoped>
.pdf-page {
  max-width: 100%;
}
.pdf-page img {
  display: block;
}
</style>
