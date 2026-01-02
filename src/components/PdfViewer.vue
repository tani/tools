<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import * as mupdf from 'mupdf';

const props = defineProps<{
  data: Uint8Array | null;
}>();

const pages = ref<string[]>([]);
const isRendering = ref(false);
const error = ref<string | null>(null);

const renderPdf = async () => {
  if (!props.data) {
    pages.value = [];
    return;
  }

  isRendering.value = true;
  error.value = null;
  pages.value = [];

  try {
    const doc = mupdf.Document.openDocument(props.data, "application/pdf");
    const pageCount = doc.countPages();
    const renderedPages: string[] = [];

    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      const pixmap = page.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, true);

      const width = pixmap.getWidth();
      const height = pixmap.getHeight();

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        const samples = new Uint8ClampedArray(pixmap.getPixels());
        const imageData = new ImageData(samples, width, height);
        ctx.putImageData(imageData, 0, 0);
        renderedPages.push(canvas.toDataURL());
      }

      pixmap.destroy();
      page.destroy();
    }

    pages.value = renderedPages;
    doc.destroy();
  } catch (err) {
    console.error("PDF Rendering Error:", err);
    error.value = "Failed to render PDF document.";
  } finally {
    isRendering.value = false;
  }
};

onMounted(renderPdf);
watch(() => props.data, renderPdf);
</script>

<template>
  <div
    class="pdf-viewer-container bg-secondary bg-opacity-10 p-3 rounded overflow-auto"
    style="max-height: 800px;"
  >
    <div v-if="isRendering" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="mt-2 text-muted small uppercase fw-bold">Rendering Document...</div>
    </div>

    <div v-else-if="error" class="alert alert-danger m-0">
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
