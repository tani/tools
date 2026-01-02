<script setup lang="ts">
import { ref } from 'vue';
import * as mupdf from 'mupdf';
import PdfViewer from '../components/PdfViewer.vue';

const fileData = ref<Uint8Array | null>(null);
const fileName = ref<string | null>(null);
const resultText = ref("");
const isProcessing = ref(false);
const copyBtnText = ref("Copy");

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
  if (!fileData.value) return;

  isProcessing.value = true;
  resultText.value = "";
  
  try {
    const doc = mupdf.Document.openDocument(fileData.value, "application/pdf");
    const pageCount = doc.countPages();
    let combinedText = "";

    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      const stext = page.toStructuredText();
      combinedText += `--- Page ${i + 1} ---\n${stext.asText()}\n\n`;
      stext.destroy();
    }

    resultText.value = combinedText;
    doc.destroy();
  } catch (error) {
    console.error("PDF Text Extraction Error:", error);
    alert("An error occurred while extracting text from the PDF.");
  } finally {
    isProcessing.value = false;
  }
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(resultText.value).then(() => {
    copyBtnText.value = "Copied!";
    setTimeout(() => {
      copyBtnText.value = "Copy";
    }, 2000);
  });
};
</script>

<template>
  <div>
    <h2 class="display-6">PDF to Text</h2>
    <p class="text-muted mb-4">
      Extract searchable text from PDF documents using MuPDF.
    </p>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-9">
            <label class="form-label fw-bold small">Upload PDF</label>
            <input
              class="form-control"
              type="file"
              accept="application/pdf"
              @change="handleFileChange"
            />
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
      </div>
    </div>

    <div class="row">
      <!-- Preview Area -->
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Source Preview</div>
          <div class="card-body bg-light p-0 overflow-auto" style="min-height: 500px">
            <PdfViewer :data="fileData" />
          </div>
        </div>
      </div>

      <!-- Result Area -->
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold small text-uppercase text-muted">Extracted Text</span>
            <button 
              v-if="resultText" 
              class="btn btn-sm btn-link p-0 text-decoration-none small"
              @click="copyToClipboard"
            >
              {{ copyBtnText }}
            </button>
          </div>
          <div class="card-body p-0">
            <textarea
              v-model="resultText"
              class="form-control border-0 font-monospace p-3 bg-light"
              style="resize: none; min-height: 500px; height: 100%;"
              readonly
              placeholder="Extracted text will appear here..."
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
