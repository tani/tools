<script setup lang="ts">
import * as Comlink from "comlink";
import Sortable from "sortablejs";
import { onMounted, onUnmounted, ref, watch } from "vue";
import DownloadLink from "../components/DownloadLink.vue";
import FilePicker from "../components/FilePicker.vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import type { PdfWorker } from "../workers/pdf-worker";

interface PageItem {
	id: string;
	originalIndex: number;
	thumbnail: string;
}

const fileData = ref<Uint8Array | null>(null);
const fileName = ref<string | null>(null);
const pages = ref<PageItem[]>([]);
const isProcessing = ref(false);
const downloadUrl = ref<string | null>(null);
const sortableList = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;

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

watch(sortableList, (newEl) => {
	if (newEl && !sortableInstance) {
		sortableInstance = Sortable.create(newEl, {
			animation: 150,
			ghostClass: "opacity-50",
			onEnd: (evt) => {
				const { oldIndex, newIndex } = evt;
				if (oldIndex !== undefined && newIndex !== undefined) {
					const item = pages.value.splice(oldIndex, 1)[0];
					pages.value.splice(newIndex, 0, item);
					downloadUrl.value = null;
				}
			},
		});
	}
});

const handleFileChange = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	if (file && file.type === "application/pdf") {
		fileName.value = file.name;
		const arrayBuffer = await file.arrayBuffer();
		fileData.value = new Uint8Array(arrayBuffer);
		downloadUrl.value = null;
		await generateThumbnails();
	}
};

const generateThumbnails = async () => {
	if (!fileData.value || !api) return;

	isProcessing.value = true;
	pages.value = [];

	try {
		const thumbnails = await api.renderThumbnails(fileData.value, 0.5);

		for (const thumb of thumbnails) {
			const canvas = document.createElement("canvas");
			canvas.width = thumb.width;
			canvas.height = thumb.height;
			const ctx = canvas.getContext("2d");

			if (ctx) {
				const samples = new Uint8ClampedArray(thumb.pixels);
				const imageData = new ImageData(samples, thumb.width, thumb.height);
				ctx.putImageData(imageData, 0, 0);

				pages.value.push({
					id: Math.random().toString(36).substr(2, 9),
					originalIndex: thumb.index,
					thumbnail: canvas.toDataURL(),
				});
			}
		}
	} catch (error) {
		console.error("Thumbnail generation error:", error);
	} finally {
		isProcessing.value = false;
	}
};

const exportPdf = async () => {
	if (!fileData.value || pages.value.length === 0 || !api) return;

	isProcessing.value = true;
	try {
		const result = await api.extractPages(
			fileData.value,
			pages.value.map((p) => p.originalIndex),
		);
		const blob = new Blob([result as BlobPart], { type: "application/pdf" });
		downloadUrl.value = URL.createObjectURL(blob);
	} catch (error) {
		console.error("PDF Export Error:", error);
		alert("An error occurred while exporting the PDF.");
	} finally {
		isProcessing.value = false;
	}
};
</script>

<template>
  <div>
    <ToolHeader
      title="PDF Sort"
      description="Rearrange or remove pages from a PDF document visually."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-md-9">
          <FilePicker label="Upload PDF" accept="application/pdf" @change="handleFileChange" />
        </div>
        <div class="col-md-3">
          <button
            class="btn btn-primary w-100"
            @click="exportPdf"
            :disabled="pages.length === 0 || isProcessing"
          >
            <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
            Export PDF
          </button>
        </div>
      </div>
    </ToolCard>

    <div
      v-if="downloadUrl"
      class="alert alert-success d-flex justify-content-between align-items-center shadow-sm mb-4"
    >
      <span><strong>Success!</strong> Your rearranged PDF is ready.</span>
      <DownloadLink
        :href="downloadUrl"
        :filename="'sorted_' + fileName"
        label="Download Sorted PDF"
        class="btn btn-success btn-sm"
      />
    </div>

    <ToolCard title="Page Workspace" class="mb-4">
      <template #header-actions>
        <span class="badge bg-secondary opacity-75">{{ pages.length }} pages</span>
      </template>

      <div class="bg-light p-3 rounded">
        <LoadingOverlay :loading="isProcessing && pages.length === 0" message="Loading Pages..." />

        <div
          v-if="pages.length > 0"
          ref="sortableList"
          class="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-6 g-3"
        >
          <div
            v-for="(page, index) in pages"
            :key="page.id"
            class="col cursor-move"
            :data-id="page.id"
          >
            <div class="card h-100 shadow-sm border-0 overflow-hidden">
              <div class="position-relative">
                <img
                  :src="page.thumbnail"
                  class="card-img-top border-bottom bg-white"
                  :alt="'Page ' + (page.originalIndex + 1)"
                />
                <div class="badge bg-dark position-absolute top-0 start-0 m-1 opacity-75">
                  #{{ index + 1 }}
                </div>
              </div>
              <div class="card-footer p-1 bg-white text-center border-0">
                <span class="x-small text-muted text-uppercase fw-bold" style="font-size: 0.6rem"
                  >Drag to move</span
                >
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-5 text-muted small uppercase fw-bold">
          No document loaded
        </div>
      </div>
    </ToolCard>
  </div>
</template>

<style scoped>
.cursor-move {
  cursor: move;
}
.btn-xs {
  padding: 0.1rem 0.25rem;
  font-size: 0.75rem;
}
.card-img-top {
  object-fit: contain;
  height: 180px;
  padding: 10px;
}
</style>
