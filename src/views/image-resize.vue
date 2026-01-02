<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";
import DownloadLink from "../components/DownloadLink.vue";

const sourceImageUrl = ref<string | null>(null);
const resultImageUrl = ref<string | null>(null);
const cropper = ref<any>(null);

const config = reactive({
  width: 0,
  height: 0,
  unit: 'px',
  maintainAspectRatio: true,
  format: 'image/png',
  quality: 0.9,
});

const prevUnit = ref('px');

const units = {
  px: 1,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
};

const toPx = (val: number, unit: string) => val * (units[unit as keyof typeof units] || 1);
const fromPx = (val: number, unit: string) => Number((val / (units[unit as keyof typeof units] || 1)).toFixed(2));

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      sourceImageUrl.value = e.target?.result as string;
      resultImageUrl.value = null;
    };
    reader.readAsDataURL(file);
  }
};

const handleCropChange = ({ canvas }: any) => {
  if (canvas) {
    if (!config.width || config.maintainAspectRatio) {
      config.width = fromPx(canvas.width, config.unit);
      config.height = fromPx(canvas.height, config.unit);
    }
    resultImageUrl.value = canvas.toDataURL(config.format, config.quality);
  }
};

const applyResize = () => {
  if (!cropper.value) return;
  const { canvas } = cropper.value.getResult();
  if (canvas) {
    const targetWidth = Math.round(toPx(config.width, config.unit));
    const targetHeight = Math.round(toPx(config.height, config.unit));

    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = targetWidth;
    resizedCanvas.height = targetHeight;
    const ctx = resizedCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
      resultImageUrl.value = resizedCanvas.toDataURL(config.format, config.quality);
    }
  }
};

const updateUnit = () => {
  // Convert current values from old unit to px, then to new unit
  const pxW = toPx(config.width, prevUnit.value);
  const pxH = toPx(config.height, prevUnit.value);
  config.width = fromPx(pxW, config.unit);
  config.height = fromPx(pxH, config.unit);
  prevUnit.value = config.unit;
};

const updateWidth = (val: number) => {
  if (config.maintainAspectRatio && cropper.value) {
    const { canvas } = cropper.value.getResult();
    if (canvas) {
      const ratio = canvas.height / canvas.width;
      config.height = Math.round(val * ratio);
    }
  }
  applyResize();
};

const updateHeight = (val: number) => {
  if (config.maintainAspectRatio && cropper.value) {
    const { canvas } = cropper.value.getResult();
    if (canvas) {
      const ratio = canvas.width / canvas.height;
      config.width = Math.round(val * ratio);
    }
  }
  applyResize();
};

watch([() => config.format, () => config.quality], applyResize);
</script>

<template>
  <div>
    <ToolHeader
      title="Image Resize"
      description="Resize and crop images visually. Adjust the crop box or set specific dimensions."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label fw-bold small">Upload Image</label>
          <input
            class="form-control"
            type="file"
            accept="image/png,image/jpeg"
            @change="handleFileChange"
          />
        </div>
        <div class="col-md-2">
          <label class="form-label fw-bold small">Width</label>
          <div class="input-group input-group-sm">
            <input
              v-model.number="config.width"
              type="number"
              class="form-control"
              @input="updateWidth(config.width)"
            />
          </div>
        </div>
        <div class="col-md-2">
          <label class="form-label fw-bold small">Height</label>
          <div class="input-group input-group-sm">
            <input
              v-model.number="config.height"
              type="number"
              class="form-control"
              @input="updateHeight(config.height)"
            />
          </div>
        </div>
        <div class="col-md-2">
          <label class="form-label fw-bold small">Unit</label>
          <select v-model="config.unit" class="form-select form-select-sm" @change="updateUnit()">
            <option value="px">Pixels (px)</option>
            <option value="cm">Centimeters (cm)</option>
            <option value="mm">Millimeters (mm)</option>
            <option value="in">Inches (in)</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label fw-bold small">Format</label>
          <select v-model="config.format" class="form-select form-select-sm">
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPG</option>
          </select>
        </div>
        <div class="col-md-2 d-flex align-items-end">
          <div class="form-check mb-2">
            <input
              v-model="config.maintainAspectRatio"
              class="form-check-input"
              type="checkbox"
              id="aspectRatio"
            />
            <label class="form-check-label small" for="aspectRatio">Lock Ratio</label>
          </div>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Cropper Workspace" class="h-100">
          <div
            class="bg-secondary bg-opacity-10 p-0 overflow-hidden d-flex align-items-center justify-content-center"
            style="min-height: 500px"
          >
            <Cropper
              v-if="sourceImageUrl"
              ref="cropper"
              class="cropper"
              :src="sourceImageUrl"
              @change="handleCropChange"
              style="width: 100%; height: 500px;"
            />
            <div v-else class="text-muted small">Upload an image to start cropping</div>
          </div>
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Final Result Preview" class="h-100">
          <template #header-actions>
            <div class="d-flex gap-3">
              <button
                v-if="resultImageUrl"
                class="btn btn-sm btn-outline-primary p-0 px-2 text-decoration-none border-0 small"
                @click="applyResize"
              >
                Update Resize
              </button>
              <DownloadLink
                :href="resultImageUrl"
                :filename="'processed_' + (config.format === 'image/png' ? 'image.png' : 'image.jpg')"
                label="Download"
              />
            </div>
          </template>
          <div
            class="bg-light p-3 d-flex align-items-center justify-content-center overflow-auto"
            style="min-height: 500px"
          >
            <img
              v-if="resultImageUrl"
              :src="resultImageUrl"
              class="img-fluid border shadow-sm"
              alt="Result"
            />
            <div v-else class="text-muted small">Result will appear here</div>
          </div>
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style>
.cropper {
  background: #ddd;
}
</style>
