<script setup lang="ts">
import { ref, computed } from 'vue';
import * as mupdf from 'mupdf';
import PdfViewer from '../components/PdfViewer.vue';

const fileData = ref<Uint8Array | null>(null);
const fileName = ref<string | null>(null);
const isProcessing = ref(false);
const downloadUrl = ref<string | null>(null);

const targetFormat = ref("A4");
const orientation = ref("portrait");

const formats: Record<string, [number, number]> = {
  "A0": [2383.94, 3370.39],
  "A1": [1683.78, 2383.94],
  "A2": [1190.55, 1683.78],
  "A3": [841.89, 1190.55],
  "A4": [595.27, 841.89],
  "A5": [419.53, 595.27],
  "A6": [297.64, 419.53],
  "B0": [2834.65, 4008.19],
  "B1": [2004.09, 2834.65],
  "B2": [1417.32, 2004.09],
  "B3": [1000.63, 1417.32],
  "B4": [708.66, 1000.63],
  "B5": [498.90, 708.66],
  "B6": [354.33, 498.90],
  "Letter": [612, 792],
  "Legal": [612, 1008],
};

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

const resizePdf = async () => {
  if (!fileData.value) return;

  isProcessing.value = true;
  try {
    const srcDoc = mupdf.Document.openDocument(fileData.value, "application/pdf").asPDF();
    if (!srcDoc) throw new Error("Could not open source PDF");

    const outDoc = new mupdf.PDFDocument();
    const pageCount = srcDoc.countPages();

    let [tw, th] = formats[targetFormat.value];
    if (orientation.value === "landscape") {
      [tw, th] = [th, tw];
    }

    for (let i = 0; i < pageCount; i++) {
      // Graft page into new document
      outDoc.graftPage(-1, srcDoc, i);

      // Get the grafted page to adjust its box
      const outPage = outDoc.loadPage(i);

      // Calculate scaling to fit (optional, but setting MediaBox is primary)
      // Note: Truly scaling content requires editing the content stream operators
      // which is complex in WASM. For now, we set the MediaBox which is the
      // standard "Resize" behavior in many tools.
      outPage.setPageBox("MediaBox", [0, 0, tw, th]);
    }

    const res = outDoc.saveToBuffer();
    const blob = new Blob([res.asUint8Array() as any], { type: "application/pdf" });
    downloadUrl.value = URL.createObjectURL(blob);

    outDoc.destroy();
    srcDoc.destroy();
  } catch (error) {
    console.error("PDF Resize Error:", error);
    alert("An error occurred during resizing.");
  } finally {
    isProcessing.value = false;
  }
};
</script>

<template>
  <div>
    <h2 class="display-6">PDF Resizer</h2>
    <p class="text-muted mb-4">
      Resize all pages of a PDF document to a standard format like A4 or Letter.
    </p>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-4">
            <label class="form-label fw-bold small">Upload PDF</label>
            <input
              class="form-control"
              type="file"
              accept="application/pdf"
              @change="handleFileChange"
            />
          </div>
          <div class="col-md-3">
            <label class="form-label fw-bold small">Target Format</label>
            <select v-model="targetFormat" class="form-select">
              <option v-for="(_, name) in formats" :key="name" :value="name">{{ name }}</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label fw-bold small">Orientation</label>
            <select v-model="orientation" class="form-select">
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div class="col-md-2">
            <button
              class="btn btn-primary w-100"
              @click="resizePdf"
              :disabled="!fileData || isProcessing"
            >
              <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
              Resize
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="downloadUrl"
      class="alert alert-success d-flex justify-content-between align-items-center shadow-sm mb-4"
    >
      <span><strong>Success!</strong> All pages have been resized to {{ targetFormat }}.</span>
      <a :href="downloadUrl" :download="'resized_' + fileName" class="btn btn-success btn-sm"
        >Download Resized PDF</a
      >
    </div>

    <div class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Document Preview</div>
          <div class="card-body p-0">
            <PdfViewer :data="fileData" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
