<script setup lang="ts">
import { ref } from 'vue';
import PdfViewer from '../components/PdfViewer.vue';
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";
import FilePicker from "../components/FilePicker.vue";

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
    <ToolHeader
      title="PDF Viewer"
      description="View multi-page PDF documents directly in your browser."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-md-9">
          <FilePicker
            label="Upload PDF Document"
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
    </ToolCard>

    <div class="row">
      <div class="col-12 mb-4">
        <ToolCard title="Document View" no-padding>
          <PdfViewer :data="fileData" />
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
