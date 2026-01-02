<script setup lang="ts">
import { ref } from 'vue';
import PdfViewer from '../components/PdfViewer.vue';

const fileData = ref<Uint8Array | null>(null);
const fileName = ref<string | null>(null);

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file && file.type === "application/pdf") {
    fileName.value = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      fileData.value = new Uint8Array(arrayBuffer);
    };
    reader.readAsArrayBuffer(file);
  }
};
</script>

<template>
  <div>
    <h2 class="display-6">PDF Viewer</h2>
    <p class="text-muted mb-4">View multi-page PDF documents directly in your browser.</p>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-9">
            <label class="form-label fw-bold small">Upload PDF Document</label>
            <input
              class="form-control"
              type="file"
              accept="application/pdf"
              @change="handleFileChange"
            />
          </div>
          <div class="col-md-3">
            <div v-if="fileName" class="text-muted small mb-2 text-truncate">
              <strong>File:</strong> {{ fileName }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Document View</div>
          <div class="card-body p-0">
            <PdfViewer :data="fileData" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
