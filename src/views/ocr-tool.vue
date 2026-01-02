<script setup lang="ts">
import { ref } from "vue";
import Tesseract from "tesseract.js";

const image = ref<string | null>(null);
const result = ref("");
const progress = ref(0);
const status = ref("");
const isProcessing = ref(false);
const language = ref("eng");
const copyBtnText = ref("Copy");

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      image.value = e.target?.result as string;
      result.value = "";
      progress.value = 0;
      status.value = "Ready to recognize";
    };
    reader.readAsDataURL(file);
  }
};

const recognizeText = async () => {
  if (!image.value) return;

  isProcessing.value = true;
  result.value = "";
  progress.value = 0;
  status.value = "Initializing...";

  try {
    const { data: { text } } = await Tesseract.recognize(
      image.value,
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
    status.value = "Recognition complete";
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
      Extract text from images using Optical Character Recognition (OCR) powered by Tesseract.js.
    </p>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-4">
            <label class="form-label fw-bold small">Language</label>
            <select v-model="language" class="form-select">
              <option value="eng">English</option>
              <option value="jpn">Japanese</option>
              <option value="fra">French</option>
              <option value="deu">German</option>
              <option value="spa">Spanish</option>
            </select>
          </div>
          <div class="col-md-5">
            <label class="form-label fw-bold small">Upload Image</label>
            <input
              class="form-control"
              type="file"
              accept="image/*"
              @change="handleFileChange"
            />
          </div>
          <div class="col-md-3">
            <button 
              class="btn btn-primary w-100" 
              type="button" 
              @click="recognizeText"
              :disabled="!image || isProcessing"
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
          <div class="card-header fw-bold small text-uppercase text-muted">Source Image</div>
          <div class="card-body bg-light overflow-auto p-3 d-flex align-items-center justify-content-center" style="min-height: 400px">
            <img v-if="image" :src="image" class="img-fluid border shadow-sm" alt="OCR Source" />
            <div v-else class="text-muted small">No image uploaded</div>
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
