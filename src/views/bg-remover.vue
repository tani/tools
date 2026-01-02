<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";
import DownloadLink from "../components/DownloadLink.vue";
import FilePicker from "../components/FilePicker.vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";

const sourceImageUrl = ref<string | null>(null);
const resultImageUrl = ref<string | null>(null);
const isProcessing = ref(false);
const isOpenCvReady = ref(false);
const errorMessage = ref<string | null>(null);
const cropper = ref<any>(null);

const config = reactive({
  mode: 'grabcut' as 'magic' | 'grabcut' | 'global',
  tolerance: 30,
  lastX: -1,
  lastY: -1,
  hasSelected: false,
});

let worker: Worker | null = null;

onMounted(() => {
  worker = new Worker(new URL('../utils/cv-worker.ts', import.meta.url), {
    type: 'module'
  });

  worker.onmessage = (e) => {
    const { type, imageData, message } = e.data;
    if (type === 'READY') {
      isOpenCvReady.value = true;
    } else if (type === 'RESULT') {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      ctx?.putImageData(imageData, 0, 0);
      resultImageUrl.value = canvas.toDataURL('image/png');
      isProcessing.value = false;
    } else if (type === 'ERROR') {
      errorMessage.value = message;
      isProcessing.value = false;
    }
  };
});

onUnmounted(() => {
  worker?.terminate();
});

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    isProcessing.value = true;
    errorMessage.value = null;
    const reader = new FileReader();
    reader.onload = (e) => {
      sourceImageUrl.value = e.target?.result as string;
      resultImageUrl.value = null;
      config.hasSelected = false;
      isProcessing.value = false;
    };
    reader.readAsDataURL(file);
  }
};

const pickColor = (event: MouseEvent) => {
  if ((config.mode !== 'magic' && config.mode !== 'global') || !sourceImageUrl.value || !isOpenCvReady.value) return;
  
  const imgElement = event.target as HTMLImageElement;
  const rect = imgElement.getBoundingClientRect();
  const scaleX = imgElement.naturalWidth / rect.width;
  const scaleY = imgElement.naturalHeight / rect.height;
  
  config.lastX = Math.round((event.clientX - rect.left) * scaleX);
  config.lastY = Math.round((event.clientY - rect.top) * scaleY);
  config.hasSelected = true;
  processImage();
};

const processImage = () => {
  if (!sourceImageUrl.value || !isOpenCvReady.value || !worker) return;
  
  isProcessing.value = true;
  errorMessage.value = null;

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (config.mode === 'grabcut' && cropper.value) {
      const { coordinates } = cropper.value.getResult();
      worker?.postMessage({
        type: 'GRABCUT',
        data: { 
          imageData, 
          rect: {
            left: Math.round(coordinates.left),
            top: Math.round(coordinates.top),
            width: Math.round(coordinates.width),
            height: Math.round(coordinates.height)
          }
        }
      }, [imageData.data.buffer]);
    } else if (config.mode === 'magic' || config.mode === 'global') {
      worker?.postMessage({
        type: config.mode === 'magic' ? 'PROCESS' : 'GLOBAL',
        data: {
          imageData,
          x: config.lastX,
          y: config.lastY,
          tolerance: config.tolerance
        }
      }, [imageData.data.buffer]);
    }
  };
  img.src = sourceImageUrl.value!;
};

let debounceTimeout: number | null = null;

watch(() => config.tolerance, () => {
  if ((config.mode === 'magic' || config.mode === 'global') && config.hasSelected) {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = window.setTimeout(() => {
      processImage();
      debounceTimeout = null;
    }, 150);
  }
});
</script>

<template>
  <div>
    <ToolHeader
      title="Background Remover"
      description="Remove background using GrabCut (area), Magic Wand (connected color), or Global Color removal."
    />

    <div v-if="errorMessage" class="alert alert-danger mb-4">
      <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ errorMessage }}
    </div>

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-md-3">
          <FilePicker label="Upload Image" accept="image/png,image/jpeg" :disabled="!isOpenCvReady" @change="handleFileChange" />
        </div>
        <div class="col-md-3">
          <label class="form-label fw-bold small">Removal Mode</label>
          <select v-model="config.mode" class="form-select form-select-sm" @change="resultImageUrl = null; config.hasSelected = false">
            <option value="grabcut">GrabCut (Area Selection)</option>
            <option value="magic">Magic Wand (Connected Color)</option>
            <option value="global">Global Color (Whole Image)</option>
          </select>
        </div>
        
        <div class="col-md-3" v-if="config.mode === 'magic' || config.mode === 'global'">
          <label class="form-label fw-bold small">Sensitivity ({{ config.tolerance }})</label>
          <input type="range" class="form-range" min="1" max="150" v-model.number="config.tolerance" />
        </div>
        
        <div class="col-md-3" v-if="config.mode === 'grabcut'">
          <button class="btn btn-primary btn-sm w-100" @click="processImage" :disabled="!sourceImageUrl || isProcessing">
            <i class="bi bi-scissors me-1"></i> Apply GrabCut
          </button>
        </div>

        <div class="col-md-3 text-end" v-else>
           <button class="btn btn-sm btn-outline-secondary" @click="sourceImageUrl = null; resultImageUrl = null; config.hasSelected = false" :disabled="!sourceImageUrl">
            Reset
          </button>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <!-- Workspace -->
      <div class="col-lg-6 mb-4">
        <ToolCard :title="config.mode === 'magic' ? 'Magic Wand (Click to remove)' : 'GrabCut (Select area)'" class="h-100">
          <div class="bg-secondary bg-opacity-10 p-0 overflow-auto d-flex align-items-center justify-content-center position-relative" style="min-height: 500px; max-height: 700px;">
            <LoadingOverlay :loading="!isOpenCvReady" message="Initializing Engine..." />
            
            <template v-if="sourceImageUrl">
              <Cropper
                v-if="config.mode === 'grabcut'"
                ref="cropper"
                :src="sourceImageUrl"
                class="mw-100 h-auto"
                style="max-height: 700px"
              />
              <img
                v-else
                :src="sourceImageUrl"
                @click="pickColor"
                class="mw-100 h-auto border shadow-sm"
                style="cursor: crosshair; max-height: 700px;"
                alt="Source"
              />
            </template>
            <div v-else-if="isOpenCvReady" class="text-muted small">
              <span v-if="config.mode === 'magic' || config.mode === 'global'">Upload an image and click on the color to remove</span>
              <span v-else>Upload an image and draw a box around the object</span>
            </div>
          </div>
        </ToolCard>
      </div>

      <!-- Result -->
      <div class="col-lg-6 mb-4">
        <ToolCard title="Transparent Result" class="h-100">
          <template #header-actions>
            <DownloadLink v-if="resultImageUrl" :href="resultImageUrl" filename="removed_background.png" label="Download PNG" />
          </template>
          <div class="checkerboard-bg p-0 overflow-auto d-flex align-items-center justify-content-center position-relative" style="min-height: 500px; max-height: 700px;">
            <LoadingOverlay :loading="isProcessing" message="Processing..." />
            <img v-if="resultImageUrl && !isProcessing" :src="resultImageUrl" class="mw-100 h-auto border shadow-sm" alt="Result" />
            <div v-else-if="!isProcessing" class="text-muted small">
              <span v-if="!sourceImageUrl">Result will appear here</span>
              <span v-else-if="config.mode === 'magic' || config.mode === 'global'">Click on the original image</span>
              <span v-else>Adjust the box and click "Apply GrabCut"</span>
            </div>
          </div>
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkerboard-bg {
  background-image: linear-gradient(45deg, #eee 25%, transparent 25%),
    linear-gradient(-45deg, #eee 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eee 75%),
    linear-gradient(-45deg, transparent 75%, #eee 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px 10px, 10px 0;
  background-color: white;
}
</style>