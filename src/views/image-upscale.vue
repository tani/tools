<script setup lang="ts">
import WebSR from "@websr/websr";
import cnn2xLarge3D from "@websr/websr/weights/anime4k/cnn-2x-l-3d.json";
import cnn2xLargeAnime from "@websr/websr/weights/anime4k/cnn-2x-l-an.json";
import cnn2xLargeRealLife from "@websr/websr/weights/anime4k/cnn-2x-l-rl.json";
import cnn2xMedium3D from "@websr/websr/weights/anime4k/cnn-2x-m-3d.json";
import cnn2xMediumAnime from "@websr/websr/weights/anime4k/cnn-2x-m-an.json";
import cnn2xMediumRealLife from "@websr/websr/weights/anime4k/cnn-2x-m-rl.json";
import cnn2xSmall3D from "@websr/websr/weights/anime4k/cnn-2x-s-3d.json";
import cnn2xSmallAnime from "@websr/websr/weights/anime4k/cnn-2x-s-an.json";
import cnn2xSmallRealLife from "@websr/websr/weights/anime4k/cnn-2x-s-rl.json";
import { onMounted, onUnmounted, reactive, ref } from "vue";
import DownloadLink from "../components/DownloadLink.vue";
import FilePicker from "../components/FilePicker.vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const sourceImageUrl = ref<string | null>(null);
const resultImageUrl = ref<string | null>(null);
const isProcessing = ref(false);
const isWebGPUAvailable = ref(true);
const errorMessage = ref<string | null>(null);

const weightsMap: Record<string, unknown> = {
	"s-an": cnn2xSmallAnime,
	"m-an": cnn2xMediumAnime,
	"l-an": cnn2xLargeAnime,
	"s-rl": cnn2xSmallRealLife,
	"m-rl": cnn2xMediumRealLife,
	"l-rl": cnn2xLargeRealLife,
	"s-3d": cnn2xSmall3D,
	"m-3d": cnn2xMedium3D,
	"l-3d": cnn2xLarge3D,
};

const networkNameMap: Record<"s" | "m" | "l", string> = {
	s: "anime4k/cnn-2x-s",
	m: "anime4k/cnn-2x-m",
	l: "anime4k/cnn-2x-l",
};

const config = reactive({
	size: "s" as "s" | "m" | "l",
	type: "an" as "an" | "rl" | "3d",
	format: "image/png" as "image/png" | "image/jpeg" | "image/webp",
});

// biome-ignore lint/suspicious/noExplicitAny: GPUDevice is not available in this project type context
let gpu: any = null;

const initWebGPU = async () => {
	try {
		gpu = await WebSR.initWebGPU();
		isWebGPUAvailable.value = Boolean(gpu);
	} catch (e) {
		console.error(e);
		isWebGPUAvailable.value = false;
		gpu = null;
	}
};

onMounted(async () => {
	await initWebGPU();
});

onUnmounted(() => {
	gpu = null;
});

const handleFileChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	if (file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			sourceImageUrl.value = e.target?.result as string;
			resultImageUrl.value = null;
			errorMessage.value = null;
		};
		reader.readAsDataURL(file);
	}
};

const upscaleImage = async () => {
	if (!sourceImageUrl.value) return;

	isProcessing.value = true;
	errorMessage.value = null;

	try {
		if (!gpu) {
			await initWebGPU();
			if (!gpu) {
				throw new Error("WebGPU initialization failed");
			}
		}

		const img = new Image();
		img.src = sourceImageUrl.value;
		await img.decode();

		const imageBitmap = await createImageBitmap(img);
		const canvas = document.createElement("canvas");
		canvas.width = imageBitmap.width * 2;
		canvas.height = imageBitmap.height * 2;

		const websr = new WebSR({
			// biome-ignore lint/suspicious/noExplicitAny: WebSR network type is not exported
			network_name: networkNameMap[config.size] as any,
			weights: weightsMap[`${config.size}-${config.type}`],
			gpu,
			canvas: canvas as OffscreenCanvas,
		});

		await websr.render(imageBitmap);
		imageBitmap.close();
		resultImageUrl.value = canvas.toDataURL(config.format, 0.9);
	} catch (e: unknown) {
		console.error(e);
		errorMessage.value =
			e instanceof Error ? e.message : "Failed to upscale image.";
	} finally {
		isProcessing.value = false;
	}
};

const getExtension = (mime: string) => {
	if (mime === "image/jpeg") return "jpg";
	if (mime === "image/webp") return "webp";
	return "png";
};
</script>

<template>
  <div>
    <ToolHeader
      title="Image Upscale"
      description="Upscale images using AI (WebSR) directly in your browser using WebGPU. It doubles the resolution (2x) of your image."
    />

    <div v-if="!isWebGPUAvailable" class="alert alert-warning mb-4">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      WebGPU is not supported in your browser or device. This tool requires WebGPU to function.
    </div>

    <div v-if="errorMessage" class="alert alert-danger mb-4">
      <i class="bi bi-exclamation-octagon-fill me-2"></i>
      {{ errorMessage }}
    </div>

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-md-3">
          <FilePicker
            label="Upload Image"
            accept="image/png,image/jpeg,image/webp"
            :disabled="!isWebGPUAvailable || isProcessing"
            @change="handleFileChange"
          />
        </div>
        <div class="col-md-2">
          <label class="form-label fw-bold small">Model Size</label>
          <select v-model="config.size" class="form-select form-select-sm" :disabled="isProcessing">
            <option value="s">Small (Fastest)</option>
            <option value="m">Medium</option>
            <option value="l">Large (Best Quality)</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label fw-bold small">Content Type</label>
          <select v-model="config.type" class="form-select form-select-sm" :disabled="isProcessing">
            <option value="an">Anime / Illustration</option>
            <option value="rl">Real Life (Photo)</option>
            <option value="3d">3D / CGI / Gaming</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label fw-bold small">Output Format</label>
          <select v-model="config.format" class="form-select form-select-sm" :disabled="isProcessing">
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
          </select>
        </div>
        <div class="col-md-2">
          <button
            class="btn btn-primary btn-sm w-100"
            @click="upscaleImage"
            :disabled="!sourceImageUrl || !isWebGPUAvailable || isProcessing"
          >
            <i class="bi bi-stars me-1"></i> Upscale
          </button>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Source Preview" class="h-100">
          <div
            class="bg-light p-3 d-flex align-items-center justify-content-center overflow-auto position-relative"
            style="min-height: 400px"
          >
            <img
              v-if="sourceImageUrl"
              :src="sourceImageUrl"
              class="img-fluid border shadow-sm"
              alt="Source"
            />
            <div v-else class="text-muted small">Upload an image to start</div>
          </div>
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Upscaled Result" class="h-100">
          <template #header-actions>
            <DownloadLink
              v-if="resultImageUrl"
              :href="resultImageUrl"
              :filename="'upscaled_image.' + getExtension(config.format)"
              :label="'Download ' + getExtension(config.format).toUpperCase()"
            />
          </template>
          <div
            class="bg-light p-3 d-flex align-items-center justify-content-center overflow-auto position-relative"
            style="min-height: 400px"
          >
            <LoadingOverlay :loading="isProcessing" message="Upscaling image..." />
            <img
              v-if="resultImageUrl && !isProcessing"
              :src="resultImageUrl"
              class="img-fluid border shadow-sm"
              alt="Result"
            />
            <div v-else-if="!isProcessing" class="text-muted small">Result will appear here</div>
          </div>
        </ToolCard>
      </div>
    </div>
  </div>
</template>
