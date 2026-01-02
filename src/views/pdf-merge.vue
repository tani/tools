<script setup lang="ts">
import { ref } from "vue";
import * as mupdf from "mupdf";
import PdfViewer from "../components/PdfViewer.vue";
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";
import FilePicker from "../components/FilePicker.vue";
import DownloadLink from "../components/DownloadLink.vue";

interface FileItem {
  id: string;
  name: string;
  data: Uint8Array;
  showPreview: boolean;
}

const files = ref<FileItem[]>([]);
const isProcessing = ref(false);
const downloadUrl = ref<string | null>(null);

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const selectedFiles = target.files;
  if (!selectedFiles) return;

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    if (file.type !== "application/pdf") continue;

    const arrayBuffer = await file.arrayBuffer();
    files.value.push({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      data: new Uint8Array(arrayBuffer),
      showPreview: false,
    });
  }
  // Reset input
  target.value = "";
  downloadUrl.value = null;
};

const removeFile = (id: string) => {
  files.value = files.value.filter((f) => f.id !== id);
  downloadUrl.value = null;
};

const togglePreview = (id: string) => {
  const file = files.value.find((f) => f.id === id);
  if (file) {
    file.showPreview = !file.showPreview;
  }
};

const moveFile = (index: number, direction: number) => {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= files.value.length) return;
  const temp = files.value[index];
  files.value[index] = files.value[newIndex];
  files.value[newIndex] = temp;
  downloadUrl.value = null;
};

const mergePdfs = async () => {
  if (files.value.length < 2) return;

  isProcessing.value = true;
  try {
    const outDoc = new mupdf.PDFDocument();

    for (const file of files.value) {
      const srcDoc = mupdf.Document.openDocument(file.data, "application/pdf").asPDF();
      if (srcDoc) {
        const pageCount = srcDoc.countPages();
        for (let i = 0; i < pageCount; i++) {
          outDoc.graftPage(-1, srcDoc, i);
        }
        srcDoc.destroy();
      }
    }

    const res = outDoc.saveToBuffer();
    const blob = new Blob([res.asUint8Array() as any], { type: "application/pdf" });
    downloadUrl.value = URL.createObjectURL(blob);
    outDoc.destroy();
  } catch (error) {
    console.error("PDF Merge Error:", error);
    alert("An error occurred while merging PDFs.");
  } finally {
    isProcessing.value = false;
  }
};
</script>

<template>
  <div>
    <ToolHeader
      title="PDF Merge"
      description="Combine multiple PDF documents into a single file. Drag and drop to reorder."
    />

    <ToolCard title="Upload Documents" class="mb-4">
      <div class="row g-3 align-items-center">
        <div class="col-md-8">
          <FilePicker accept="application/pdf" multiple @change="handleFileChange" />
        </div>
        <div class="col-md-4">
          <button
            class="btn btn-primary w-100"
            @click="mergePdfs"
            :disabled="files.length < 2 || isProcessing"
          >
            <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
            Merge PDFs
          </button>
        </div>
      </div>
    </ToolCard>

    <div
      v-if="downloadUrl"
      class="alert alert-success d-flex justify-content-between align-items-center shadow-sm mb-4"
    >
      <span><strong>Success!</strong> Your PDFs have been merged.</span>
      <DownloadLink
        :href="downloadUrl"
        filename="merged.pdf"
        label="Download Merged PDF"
        class="btn btn-success btn-sm"
      />
    </div>

    <ToolCard title="File List" no-padding class="mb-4">
      <template #header-actions>
        <span class="badge bg-secondary opacity-75">{{ files.length }} files</span>
      </template>

      <ul v-if="files.length > 0" class="list-group list-group-flush">
        <li v-for="(file, index) in files" :key="file.id" class="list-group-item p-0">
          <div class="d-flex align-items-center gap-3 p-3">
            <div class="d-flex flex-column gap-1">
              <button
                class="btn btn-sm btn-outline-secondary p-0 px-1"
                @click="moveFile(index, -1)"
                :disabled="index === 0"
              >
                ▲
              </button>
              <button
                class="btn btn-sm btn-outline-secondary p-0 px-1"
                @click="moveFile(index, 1)"
                :disabled="index === files.length - 1"
              >
                ▼
              </button>
            </div>
            <span class="flex-grow-1 text-truncate fw-bold">{{ file.name }}</span>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary" @click="togglePreview(file.id)">
                {{ file.showPreview ? "Hide Preview" : "Preview" }}
              </button>
              <button class="btn btn-sm btn-outline-danger" @click="removeFile(file.id)">
                Remove
              </button>
            </div>
          </div>
          <div v-if="file.showPreview" class="bg-light border-top p-3">
            <PdfViewer :data="file.data" />
          </div>
        </li>
      </ul>
      <div v-else class="text-center py-5 text-muted small uppercase fw-bold">
        No files uploaded yet
      </div>
    </ToolCard>
  </div>
</template>

<style scoped>
.list-group-item {
  transition: background-color 0.2s;
}
.list-group-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>