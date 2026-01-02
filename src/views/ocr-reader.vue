<script setup lang="ts">
import { ref } from "vue";
import Tesseract from "tesseract.js";
import * as mupdf from "mupdf";
import PdfViewer from "../components/PdfViewer.vue";

const image = ref<string | null>(null);
const fileData = ref<Uint8Array | null>(null);
const fileType = ref<string | null>(null);
const result = ref("");
const progress = ref(0);
const status = ref("");
const isProcessing = ref(false);
const language = ref("eng");
const copyBtnText = ref("Copy");

const supportedLanguages = [
  { code: "amh", name: "Amharic" },
  { code: "ara", name: "Arabic" },
  { code: "ben", name: "Bengali" },
  { code: "mya", name: "Burmese" },
  { code: "chi_sim", name: "Chinese - Simplified" },
  { code: "chi_tra", name: "Chinese - Traditional" },
  { code: "ces", name: "Czech" },
  { code: "dan", name: "Danish" },
  { code: "nld", name: "Dutch" },
  { code: "eng", name: "English" },
  { code: "fas", name: "Persian" },
  { code: "fin", name: "Finnish" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "ell", name: "Greek" },
  { code: "guj", name: "Gujarati" },
  { code: "heb", name: "Hebrew" },
  { code: "hin", name: "Hindi" },
  { code: "ind", name: "Indonesian" },
  { code: "ita", name: "Italian" },
  { code: "jpn", name: "Japanese" },
  { code: "kan", name: "Kannada" },
  { code: "khm", name: "Khmer" },
  { code: "kor", name: "Korean" },
  { code: "lao", name: "Lao" },
  { code: "lat", name: "Latin" },
  { code: "msa", name: "Malay" },
  { code: "mal", name: "Malayalam" },
  { code: "mar", name: "Marathi" },
  { code: "nor", name: "Norwegian" },
  { code: "pol", name: "Polish" },
  { code: "por", name: "Portuguese" },
  { code: "pan", name: "Punjabi" },
  { code: "rus", name: "Russian" },
  { code: "slk", name: "Slovak" },
  { code: "spa", name: "Spanish" },
  { code: "swa", name: "Swahili" },
  { code: "swe", name: "Swedish" },
  { code: "tgl", name: "Tagalog" },
  { code: "tam", name: "Tamil" },
  { code: "tel", name: "Telugu" },
  { code: "tha", name: "Thai" },
  { code: "tur", name: "Turkish" },
  { code: "ukr", name: "Ukrainian" },
  { code: "urd", name: "Urdu" },
  { code: "vie", name: "Vietnamese" },
];

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    fileType.value = file.type;
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      fileData.value = new Uint8Array(arrayBuffer);
      
      if (file.type === "application/pdf") {
        image.value = null;
        status.value = "PDF Loaded. Ready to recognize.";
      } else {
        const blob = new Blob([fileData.value as any], { type: file.type });
        image.value = URL.createObjectURL(blob);
        status.value = "Image Loaded. Ready to recognize.";
      }
      result.value = "";
      progress.value = 0;
    };
    reader.readAsArrayBuffer(file);
  }
};

const recognizeText = async () => {
  if (!fileData.value) return;

  isProcessing.value = true;
  result.value = "";
  progress.value = 0;
  status.value = "Initializing...";

  try {
    if (fileType.value === "application/pdf") {
      const doc = mupdf.Document.openDocument(fileData.value!, "application/pdf");
      const pageCount = doc.countPages();
      let combinedText = "";

      for (let i = 0; i < pageCount; i++) {
        status.value = `Processing PDF page ${i + 1} of ${pageCount}...`;
        const page = doc.loadPage(i);
        const pixmap = page.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, true);
        const width = pixmap.getWidth();
        const height = pixmap.getHeight();
        
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          pixmap.destroy();
          continue;
        }

        const samples = new Uint8ClampedArray(pixmap.getPixels());
        const imageData = new ImageData(samples, width, height);
        ctx.putImageData(imageData, 0, 0);
        
        const pageImage = canvas.toDataURL("image/png");
        
        const { data: { text } } = await Tesseract.recognize(
          pageImage,
          language.value,
          {
            logger: (m) => {
              if (m.status === "recognizing text") {
                progress.value = ((i / pageCount) + (m.progress / pageCount));
              }
            },
          }
        );
        combinedText += `--- Page ${i + 1} ---\n${text}\n\n`;
        pixmap.destroy();
      }
      result.value = combinedText;
      doc.destroy();
    } else {
      const { data: { text } } = await Tesseract.recognize(
        image.value!,
        language.value,
        {
          logger: (m) => {
            if (m.status === "recognizing text") {
              progress.value = m.progress;
            }
            status.value = m.status;
          },
        }
      );
      result.value = text;
    }
    status.value = "Recognition complete";
    progress.value = 1;
  } catch (error) {
    console.error("OCR Error:", error);
    status.value = "Error occurred during recognition";
  } finally {
    isProcessing.value = false;
  }
};

const copyToClipboard = () => {
  navigator.clipboard.writeText(result.value).then(() => {
    copyBtnText.value = "Copied!";
    setTimeout(() => {
      copyBtnText.value = "Copy";
    }, 2000);
  });
};
</script>

<template>
  <div>
    <h2 class="display-6">OCR Tool</h2>
    <p class="text-muted mb-4">
      Extract text from images or PDF documents using Optical Character Recognition (OCR) powered by Tesseract.js and MuPDF.
    </p>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-4">
            <label class="form-label fw-bold small">Language</label>
            <select v-model="language" class="form-select">
              <option v-for="lang in supportedLanguages" :key="lang.code" :value="lang.code">
                {{ lang.name }}
              </option>
            </select>
          </div>
          <div class="col-md-5">
            <label class="form-label fw-bold small">Upload Image or PDF</label>
            <input
              class="form-control"
              type="file"
              accept="image/*,application/pdf"
              @change="handleFileChange"
            />
          </div>
          <div class="col-md-3">
            <button 
              class="btn btn-primary w-100" 
              type="button" 
              @click="recognizeText"
              :disabled="!fileData || isProcessing"
            >
              <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
              {{ isProcessing ? 'Processing...' : 'Start OCR' }}
            </button>
          </div>
        </div>
        <div v-if="isProcessing || progress > 0" class="mt-3">
          <div class="d-flex justify-content-between mb-1">
            <span class="small text-muted text-uppercase fw-bold">{{ status }}</span>
            <span class="small text-muted">{{ Math.round(progress * 100) }}%</span>
          </div>
          <div class="progress" style="height: 10px;">
            <div 
              class="progress-bar" 
              role="progressbar" 
              :class="{ 
                'progress-bar-striped progress-bar-animated': isProcessing,
                'bg-success': status === 'Recognition complete'
              }"
              :style="{ width: `${progress * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Source Preview</div>
          <div class="card-body bg-light overflow-auto p-0 d-flex align-items-center justify-content-center" style="min-height: 400px">
            <div v-if="image" class="p-3">
              <img :src="image" class="img-fluid border shadow-sm" alt="OCR Source" />
            </div>
            <PdfViewer v-else-if="fileType === 'application/pdf'" :data="fileData" />
            <div v-else class="text-muted small">No file uploaded</div>
          </div>
        </div>
      </div>
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold small text-uppercase text-muted">Extracted Text</span>
            <button 
              v-if="result" 
              class="btn btn-sm btn-link p-0 text-decoration-none small" 
              @click="copyToClipboard"
            >
              {{ copyBtnText }}
            </button>
          </div>
          <div class="card-body bg-light p-0 d-flex flex-column">
            <textarea
              v-model="result"
              class="form-control border-0 font-monospace p-3 bg-light flex-grow-1"
              style="resize: none; min-height: 400px"
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
