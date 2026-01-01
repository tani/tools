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
    <h2>SVG to PNG</h2>
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
    <div class="row mt-2">
      <div class="col-sm-6">
        <div class="preview-container">
          <h3 v-if="svg === ''">SVG</h3>
          <img v-else :width="x" :height="y" :src="svg" alt="svg" />
        </div>
      </div>
      <div class="col-sm-6">
        <div class="preview-container">
          <h3 v-if="png === ''">PNG</h3>
          <img v-else :width="x" :height="y" :src="png" alt="png" />
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
