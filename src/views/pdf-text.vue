<script setup lang="ts">
import { ref } from 'vue';
import * as mupdf from 'mupdf';
import PdfViewer from '../components/PdfViewer.vue';
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";

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
    <ToolHeader
      title="PDF → Text"
      description="Extract searchable text from PDF documents using MuPDF."
    />

    <ToolCard title="Configuration" class="mb-4">
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
    </ToolCard>

    <div class="row">
      <!-- Preview Area -->
      <div class="col-lg-6 mb-4">
        <ToolCard title="Source Preview" class="h-100" no-padding>
          <div class="overflow-auto" style="min-height: 500px; max-height: 800px;">
            <PdfViewer :data="fileData" />
          </div>
        </ToolCard>
      </div>

      <!-- Result Area -->
      <div class="col-lg-6 mb-4">
        <ToolCard title="Extracted Text" class="h-100" no-padding>
          <template #header-actions>
            <button
              v-if="resultText"
              class="btn btn-sm btn-link p-0 text-decoration-none small"
              @click="copyToClipboard"
            >
              {{ copyBtnText }}
            </button>
          </template>
          <textarea
            v-model="resultText"
            class="form-control border-0 font-monospace p-3 bg-light"
            style="resize: none; min-height: 500px; height: 100%;"
            readonly
            placeholder="Extracted text will appear here..."
          />
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
