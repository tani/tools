<script setup lang="ts">
import { ref, watch } from "vue";

const x = ref(300);
const y = ref(300);
const svg = ref("");
const png = ref("");
const raw = ref(`<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect x="50" y="50" width="200" height="200" fill="skyblue" rx="20" />
  <circle cx="150" cy="150" r="80" fill="orange" />
  <text x="150" y="160" font-size="24" text-anchor="middle" fill="white" font-family="sans-serif">SVG</text>
</svg>`);

// Watch raw and update svg preview
watch(raw, (newRaw) => {
  svg.value = `data:image/svg+xml,${encodeURIComponent(newRaw)}`;
}, { immediate: true });

const handleClick = async () => {
  const canvas = document.createElement("canvas");
  canvas.width = x.value;
  canvas.height = y.value;
  const context = canvas.getContext("2d");
  if (!context) return;

  const img = new Image();
  const svgBlob = new Blob([raw.value], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        context.drawImage(img, 0, 0, x.value, y.value);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });

    png.value = canvas.toDataURL();
  } catch (error) {
    console.error("Conversion failed", error);
    URL.revokeObjectURL(url);
  }
};

const handleChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const rawText = await file.text();
  raw.value = rawText;
};
</script>

<template>
  <div>
    <h2 class="display-6">SVG to PNG</h2>
    <p class="text-muted mb-4">Convert SVG images to PNG format with custom dimensions.</p>

    <div class="card mb-4">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-3">
            <label class="form-label fw-bold small">Width (px)</label>
            <input v-model.number="x" class="form-control" type="number" />
          </div>
          <div class="col-md-3">
            <label class="form-label fw-bold small">Height (px)</label>
            <input v-model.number="y" class="form-control" type="number" />
          </div>
          <div class="col-md-4">
            <label class="form-label fw-bold small">Upload SVG</label>
            <input class="form-control" type="file" accept="image/svg+xml" @change="handleChange" />
          </div>
          <div class="col-md-2">
            <button class="btn btn-primary w-100" type="button" @click="handleClick">
              Convert
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">SVG Code</div>
          <div class="card-body p-0">
            <textarea
              v-model="raw"
              class="form-control border-0 font-monospace p-3"
              rows="10"
              style="resize: none;"
              placeholder="Paste or edit SVG code here..."
            />
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">SVG Preview</div>
          <div
            class="card-body bg-light overflow-auto p-3 d-flex align-items-center justify-content-center"
            style="min-height: 400px"
          >
            <img v-if="svg" :src="svg" class="img-fluid" alt="SVG preview" />
            <div v-else class="text-muted small">SVG preview will appear here</div>
          </div>
        </div>
      </div>
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold small text-uppercase text-muted">PNG Preview</span>
            <a
              v-if="png"
              :href="png"
              download="converted.png"
              class="btn btn-sm btn-link p-0 text-decoration-none small"
              >Download</a
            >
          </div>
          <div
            class="card-body bg-light text-center p-3 d-flex align-items-center justify-content-center"
            style="min-height: 400px"
          >
            <img v-if="png" :src="png" class="img-fluid" alt="PNG preview" />
            <div v-else class="text-muted small">PNG preview will appear here</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
