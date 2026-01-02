<script setup lang="ts">
import { ref } from "vue";

const x = ref(300);
const y = ref(300);
const svg = ref("");
const png = ref("");
const raw = ref("");

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
  svg.value = `data:image/svg+xml,${encodeURIComponent(rawText)}`;
};
</script>

<template>
  <div>
    <h2 class="display-6">SVG to PNG</h2>
    <p class="text-muted">
      Convert SVG images to PNG format with custom dimensions.
    </p>
    <div class="row">
      <div class="col-sm-3">
        <input v-model.number="x" name="x" class="form-control" type="number" />
      </div>
      <div class="col-sm-3">
        <input v-model.number="y" name="y" class="form-control" type="number" />
      </div>
      <div class="col-sm-3">
        <input
          name="file"
          class="form-control"
          type="file"
          accept="image/svg+xml"
          @change="handleChange"
        />
      </div>
      <div class="col-sm-3">
        <button class="btn btn-primary" type="button" @click="handleClick">Convert</button>
      </div>
    </div>
    <div class="row mt-3">
      <div class="col-sm-6 mb-3">
        <div class="card h-100">
          <div class="card-header">SVG Preview</div>
          <div class="card-body bg-light overflow-auto p-3" style="min-height: 500px">
            <div v-html="svg" />
            <div v-if="!svg" class="text-center text-muted py-5">SVG preview will appear here</div>
          </div>
        </div>
      </div>
      <div class="col-sm-6 mb-3">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>PNG Preview</span>
            <a v-if="png" :href="png" download="converted.png" class="btn btn-sm btn-link p-0 text-decoration-none">Download</a>
          </div>
          <div class="card-body bg-light text-center p-3" style="min-height: 500px">
            <img v-if="png" :src="png" class="img-fluid" alt="PNG preview" />
            <div v-else class="text-center text-muted py-5">PNG preview will appear here</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  border: solid 1px #ccc;
  border-radius: 5px;
  overflow-y: auto;
}
</style>
