<script setup lang="ts">
import cnn2xLarge3D from "@websr/websr/weights/anime4k/cnn-2x-l-3d.json";
import cnn2xLargeAnime from "@websr/websr/weights/anime4k/cnn-2x-l-an.json";
import cnn2xLargeRealLife from "@websr/websr/weights/anime4k/cnn-2x-l-rl.json";
import cnn2xMedium3D from "@websr/websr/weights/anime4k/cnn-2x-m-3d.json";
import cnn2xMediumAnime from "@websr/websr/weights/anime4k/cnn-2x-m-an.json";
import cnn2xMediumRealLife from "@websr/websr/weights/anime4k/cnn-2x-m-rl.json";
import cnn2xSmall3D from "@websr/websr/weights/anime4k/cnn-2x-s-3d.json";
import cnn2xSmallAnime from "@websr/websr/weights/anime4k/cnn-2x-s-an.json";
import cnn2xSmallRealLife from "@websr/websr/weights/anime4k/cnn-2x-s-rl.json";
import * as Comlink from "comlink";
import { computed, onMounted, onUnmounted, ref } from "vue";
import DownloadLink from "../components/DownloadLink.vue";
import FilePicker from "../components/FilePicker.vue";
import ImageCropper from "../components/ImageCropper.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import { loadWebSR } from "../websr";
import type { OpencvWorker } from "../workers/opencv-worker";
import OpencvWorkerConstructor from "../workers/opencv-worker?worker";
import type { TesseractWorker } from "../workers/tesseract-worker";
import TesseractWorkerConstructor from "../workers/tesseract-worker?worker";

type ProcessType = "resize" | "upscale" | "convert" | "bg-remover" | "ocr";

type ResizeConfig = {
	width: number;
	height: number;
	keepAspectRatio: boolean;
};

type ConvertConfig = {
	format: "image/png" | "image/jpeg" | "image/webp";
	quality: number;
};

type UpscaleConfig = {
	size: "s" | "m" | "l";
	type: "an" | "rl" | "3d";
};

type BgRemoverConfig = {
	mode: "magic" | "global" | "grabcut";
	tolerance: number;
	sampleX: number;
	sampleY: number;
	hasSample: boolean;
};

type OcrConfig = {
	language: string;
};

type StepConfig =
	| ResizeConfig
	| UpscaleConfig
	| ConvertConfig
	| BgRemoverConfig
	| OcrConfig;

type PipelineStep = {
	id: number;
	type: ProcessType;
	config: StepConfig;
};

type PipelineResult = {
	stepId: number;
	stepTitle: string;
	outputType: "image" | "text";
	previewUrl?: string;
	text?: string;
	meta: string;
};

const processTypeLabels: Record<ProcessType, string> = {
	resize: "Image Resize",
	upscale: "Image Upscale",
	convert: "Image Convert",
	"bg-remover": "BG Remover",
	ocr: "OCR",
};

const processTypeOptions: { value: ProcessType; label: string }[] = [
	{ value: "resize", label: "Image Resize" },
	{ value: "upscale", label: "Image Upscale" },
	{ value: "convert", label: "Image Convert" },
	{ value: "bg-remover", label: "BG Remover" },
	{ value: "ocr", label: "OCR" },
];

const supportedLanguages = [
	{ code: "eng", name: "English" },
	{ code: "jpn", name: "Japanese" },
	{ code: "chi_sim", name: "Chinese (Simplified)" },
	{ code: "kor", name: "Korean" },
	{ code: "fra", name: "French" },
	{ code: "deu", name: "German" },
	{ code: "spa", name: "Spanish" },
	{ code: "ita", name: "Italian" },
	{ code: "por", name: "Portuguese" },
	{ code: "rus", name: "Russian" },
	{ code: "ukr", name: "Ukrainian" },
	{ code: "hin", name: "Hindi" },
	{ code: "tha", name: "Thai" },
];

const sourceImageUrl = ref<string | null>(null);
const sourceFileName = ref("input-image");
const downloadAs = ref("pipeline-output");
const sourceDetails = ref<{ width: number; height: number } | null>(null);
const pipelineSteps = ref<PipelineStep[]>([]);
const nextProcessType = ref<ProcessType>("resize");
const waitingForSampleStepId = ref<number | null>(null);
const waitingForGrabCutStepId = ref<number | null>(null);
const previewImageUrl = ref<string | null>(null);
const runMessage = ref("");
const grabCutCropper = ref<InstanceType<typeof ImageCropper> | null>(null);

const isProcessing = ref(false);
const isWebGPUAvailable = ref(true);
const runError = ref("");
const results = ref<PipelineResult[]>([]);
const finalImageUrl = ref<string | null>(null);
const finalText = ref("");
const finalImageMimeType = ref<"image/png" | "image/jpeg" | "image/webp">(
	"image/png",
);

let stepIdCounter = 1;
let opencvWorker: Worker | null = null;
let opencvApi: Comlink.Remote<OpencvWorker> | null = null;
let tesseractWorker: Worker | null = null;
let tesseractApi: Comlink.Remote<TesseractWorker> | null = null;
// biome-ignore lint/suspicious/noExplicitAny: GPUDevice is not available in this project type context
let gpu: any = null;
let sampleResolver: ((point: { x: number; y: number }) => void) | null = null;
let grabCutResolver:
	| ((rect: {
			left: number;
			top: number;
			width: number;
			height: number;
	  }) => void)
	| null = null;

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

const initWebGPU = async () => {
	try {
		const WebSR = await loadWebSR();
		gpu = await WebSR.initWebGPU();
		isWebGPUAvailable.value = Boolean(gpu);
	} catch {
		isWebGPUAvailable.value = false;
		gpu = null;
	}
};

const createDefaultConfig = (type: ProcessType): StepConfig => {
	switch (type) {
		case "resize":
			return { width: 1200, height: 800, keepAspectRatio: true };
		case "upscale":
			return { size: "s", type: "an" };
		case "convert":
			return { format: "image/png", quality: 0.9 };
		case "bg-remover":
			return {
				mode: "magic",
				tolerance: 28,
				sampleX: 0,
				sampleY: 0,
				hasSample: false,
			};
		case "ocr":
			return { language: "eng" };
	}
};

const addStep = (type = nextProcessType.value) => {
	pipelineSteps.value.push({
		id: stepIdCounter++,
		type,
		config: createDefaultConfig(type),
	});
};

const removeStep = (index: number) => {
	pipelineSteps.value.splice(index, 1);
};

const moveStep = (index: number, direction: -1 | 1) => {
	const targetIndex = index + direction;
	if (targetIndex < 0 || targetIndex >= pipelineSteps.value.length) return;
	const [step] = pipelineSteps.value.splice(index, 1);
	pipelineSteps.value.splice(targetIndex, 0, step);
};

const getStepTitle = (step: PipelineStep, index: number) => {
	return `Step ${index + 1} - ${processTypeLabels[step.type]}`;
};

const isLossyFormat = (format: string) => {
	return format === "image/jpeg" || format === "image/webp";
};

const validationErrors = computed(() => {
	const errors: string[] = [];
	if (pipelineSteps.value.length === 0) {
		errors.push("Add at least one process step.");
		return errors;
	}

	const ocrIndex = pipelineSteps.value.findIndex((step) => step.type === "ocr");
	if (ocrIndex >= 0 && ocrIndex !== pipelineSteps.value.length - 1) {
		errors.push(
			`OCR outputs text, so Step ${ocrIndex + 1} must be the final step in the pipeline.`,
		);
	}

	return errors;
});

const canRun = computed(() => {
	return (
		!isProcessing.value &&
		!!sourceImageUrl.value &&
		validationErrors.value.length === 0
	);
});

const hasUpscaleStep = computed(() => {
	return pipelineSteps.value.some((step) => step.type === "upscale");
});

const outputMode = computed(() => {
	if (finalText.value) return "text";
	if (finalImageUrl.value) return "image";
	return "none";
});

const finalFileName = computed(() => {
	const requested = downloadAs.value.trim().replace(/\.[^.]+$/, "");
	const base =
		requested ||
		sourceFileName.value.replace(/\.[^.]+$/, "") ||
		"pipeline-output";
	const ext =
		finalImageMimeType.value === "image/jpeg"
			? "jpg"
			: finalImageMimeType.value === "image/webp"
				? "webp"
				: "png";
	return `${base}.${ext}`;
});

const loadImage = (src: string): Promise<HTMLImageElement> => {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Unable to load image data."));
		image.src = src;
	});
};

const imageDataFromUrl = async (url: string) => {
	const image = await loadImage(url);
	const canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Failed to create canvas context.");
	context.drawImage(image, 0, 0);
	return context.getImageData(0, 0, canvas.width, canvas.height);
};

const imageDataToDataUrl = async (
	imageData: ImageData,
	format: "image/png" | "image/jpeg" | "image/webp",
	quality?: number,
) => {
	const canvas = document.createElement("canvas");
	canvas.width = imageData.width;
	canvas.height = imageData.height;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Failed to create canvas context.");
	context.putImageData(imageData, 0, 0);
	return canvas.toDataURL(format, quality);
};

const resizeImageData = async (imageData: ImageData, config: ResizeConfig) => {
	const srcCanvas = document.createElement("canvas");
	srcCanvas.width = imageData.width;
	srcCanvas.height = imageData.height;
	const srcContext = srcCanvas.getContext("2d");
	if (!srcContext) throw new Error("Failed to create source context.");
	srcContext.putImageData(imageData, 0, 0);

	let targetWidth = Math.max(1, Math.round(config.width));
	let targetHeight = Math.max(1, Math.round(config.height));

	if (config.keepAspectRatio) {
		const ratio = imageData.height / imageData.width;
		targetHeight = Math.max(1, Math.round(targetWidth * ratio));
	}

	const dstCanvas = document.createElement("canvas");
	dstCanvas.width = targetWidth;
	dstCanvas.height = targetHeight;
	const dstContext = dstCanvas.getContext("2d");
	if (!dstContext) throw new Error("Failed to create destination context.");
	dstContext.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);
	return dstContext.getImageData(0, 0, targetWidth, targetHeight);
};

const upscaleImageData = async (
	imageData: ImageData,
	config: UpscaleConfig,
) => {
	if (!gpu) {
		await initWebGPU();
		if (!gpu) {
			throw new Error(
				"WebGPU is unavailable. Image Upscale step requires WebGPU support.",
			);
		}
	}

	const srcCanvas = document.createElement("canvas");
	srcCanvas.width = imageData.width;
	srcCanvas.height = imageData.height;
	const srcContext = srcCanvas.getContext("2d");
	if (!srcContext) throw new Error("Failed to create source context.");
	srcContext.putImageData(imageData, 0, 0);

	const imageBitmap = await createImageBitmap(srcCanvas);
	const dstCanvas = document.createElement("canvas");
	dstCanvas.width = imageBitmap.width * 2;
	dstCanvas.height = imageBitmap.height * 2;
	const WebSR = await loadWebSR();

	const websr = new WebSR({
		// biome-ignore lint/suspicious/noExplicitAny: WebSR network type is not exported
		network_name: networkNameMap[config.size] as any,
		weights: weightsMap[`${config.size}-${config.type}`],
		gpu,
		canvas: dstCanvas as OffscreenCanvas,
	});

	await websr.render(imageBitmap);
	imageBitmap.close();

	const dstContext = dstCanvas.getContext("2d");
	if (!dstContext) throw new Error("Failed to create destination context.");
	return dstContext.getImageData(0, 0, dstCanvas.width, dstCanvas.height);
};

const waitForSamplePoint = (stepId: number) => {
	waitingForSampleStepId.value = stepId;
	runMessage.value =
		"Pipeline paused: click the preview image to sample background.";
	return new Promise<{ x: number; y: number }>((resolve) => {
		sampleResolver = resolve;
	});
};

const waitForGrabCutRect = (stepId: number) => {
	waitingForGrabCutStepId.value = stepId;
	runMessage.value =
		"Pipeline paused: adjust the rectangle on preview and click Apply Rectangle.";
	return new Promise<{
		left: number;
		top: number;
		width: number;
		height: number;
	}>((resolve) => {
		grabCutResolver = resolve;
	});
};

const applyGrabCutRectangle = () => {
	if (!grabCutResolver || !grabCutCropper.value) return;
	const { coordinates } = grabCutCropper.value.getResult();
	const left = Math.max(0, Math.round(coordinates.left));
	const top = Math.max(0, Math.round(coordinates.top));
	const width = Math.max(1, Math.round(coordinates.width));
	const height = Math.max(1, Math.round(coordinates.height));
	grabCutResolver({ left, top, width, height });
	grabCutResolver = null;
	waitingForGrabCutStepId.value = null;
	runMessage.value = "Resuming pipeline...";
};

const handlePreviewClick = (event: MouseEvent) => {
	if (!waitingForSampleStepId.value || !sampleResolver) return;
	const target = event.target;
	if (!(target instanceof HTMLImageElement)) return;

	const rect = target.getBoundingClientRect();
	const x = Math.round(
		((event.clientX - rect.left) / rect.width) * target.naturalWidth,
	);
	const y = Math.round(
		((event.clientY - rect.top) / rect.height) * target.naturalHeight,
	);

	const boundedX = Math.max(0, Math.min(target.naturalWidth - 1, x));
	const boundedY = Math.max(0, Math.min(target.naturalHeight - 1, y));
	sampleResolver({ x: boundedX, y: boundedY });
	sampleResolver = null;
	waitingForSampleStepId.value = null;
	runMessage.value = "Resuming pipeline...";
};

const resetRunState = () => {
	runError.value = "";
	runMessage.value = "";
	results.value = [];
	finalImageUrl.value = null;
	finalText.value = "";
	finalImageMimeType.value = "image/png";
	waitingForSampleStepId.value = null;
	waitingForGrabCutStepId.value = null;
	sampleResolver = null;
	grabCutResolver = null;
};

const handleFileChange = async (event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	if (!file) return;

	if (sourceImageUrl.value) {
		URL.revokeObjectURL(sourceImageUrl.value);
	}
	sourceImageUrl.value = URL.createObjectURL(file);
	sourceFileName.value = file.name;
	downloadAs.value = file.name.replace(/\.[^.]+$/, "") || "pipeline-output";
	previewImageUrl.value = sourceImageUrl.value;
	resetRunState();

	try {
		const image = await loadImage(sourceImageUrl.value);
		sourceDetails.value = { width: image.width, height: image.height };
	} catch {
		sourceDetails.value = null;
		runError.value = "Could not read the uploaded image.";
	}
};

const runPipeline = async () => {
	if (!sourceImageUrl.value) return;
	if (validationErrors.value.length > 0) return;
	if (!opencvApi || !tesseractApi) {
		runError.value = "Processing workers are not ready yet.";
		return;
	}

	isProcessing.value = true;
	resetRunState();

	try {
		if (pipelineSteps.value.some((step) => step.type === "upscale")) {
			await initWebGPU();
			if (!gpu) {
				throw new Error(
					"WebGPU is unavailable. Remove Image Upscale steps or use a browser/device with WebGPU support.",
				);
			}
		}

		let currentImageData = await imageDataFromUrl(sourceImageUrl.value);
		let lastImageOutputUrl = "";
		let lastMimeType: "image/png" | "image/jpeg" | "image/webp" = "image/png";
		previewImageUrl.value = await imageDataToDataUrl(
			currentImageData,
			"image/png",
		);
		for (const step of pipelineSteps.value) {
			if (step.type === "bg-remover") {
				(step.config as BgRemoverConfig).hasSample = false;
			}
		}

		for (const [index, step] of pipelineSteps.value.entries()) {
			if (step.type === "resize") {
				const config = step.config as ResizeConfig;
				currentImageData = await resizeImageData(currentImageData, config);
				const previewUrl = await imageDataToDataUrl(
					currentImageData,
					"image/png",
				);
				results.value.push({
					stepId: step.id,
					stepTitle: getStepTitle(step, index),
					outputType: "image",
					previewUrl,
					meta: `${currentImageData.width} x ${currentImageData.height} px`,
				});
				lastImageOutputUrl = previewUrl;
				lastMimeType = "image/png";
				previewImageUrl.value = previewUrl;
				continue;
			}

			if (step.type === "upscale") {
				const config = step.config as UpscaleConfig;
				currentImageData = await upscaleImageData(currentImageData, config);
				const previewUrl = await imageDataToDataUrl(
					currentImageData,
					"image/png",
				);
				results.value.push({
					stepId: step.id,
					stepTitle: getStepTitle(step, index),
					outputType: "image",
					previewUrl,
					meta: `2x | Model: ${config.size.toUpperCase()}-${config.type.toUpperCase()} | ${currentImageData.width} x ${currentImageData.height} px`,
				});
				lastImageOutputUrl = previewUrl;
				lastMimeType = "image/png";
				previewImageUrl.value = previewUrl;
				continue;
			}

			if (step.type === "convert") {
				const config = step.config as ConvertConfig;
				const encodedUrl = await imageDataToDataUrl(
					currentImageData,
					config.format,
					config.quality,
				);
				currentImageData = await imageDataFromUrl(encodedUrl);
				results.value.push({
					stepId: step.id,
					stepTitle: getStepTitle(step, index),
					outputType: "image",
					previewUrl: encodedUrl,
					meta: `${config.format.replace("image/", "").toUpperCase()} | ${currentImageData.width} x ${currentImageData.height} px`,
				});
				lastImageOutputUrl = encodedUrl;
				lastMimeType = config.format;
				previewImageUrl.value = encodedUrl;
				continue;
			}

			if (step.type === "bg-remover") {
				const config = step.config as BgRemoverConfig;
				if (config.mode !== "grabcut" && !config.hasSample) {
					const point = await waitForSamplePoint(step.id);
					config.sampleX = point.x;
					config.sampleY = point.y;
					config.hasSample = true;
				}
				let output: ImageData;
				if (config.mode === "grabcut") {
					const rect = await waitForGrabCutRect(step.id);
					output = await opencvApi.grabCut(currentImageData, rect);
				} else if (config.mode === "global") {
					output = await opencvApi.globalRemoval(
						currentImageData,
						config.sampleX,
						config.sampleY,
						config.tolerance,
					);
				} else {
					output = await opencvApi.process(
						currentImageData,
						config.sampleX,
						config.sampleY,
						config.tolerance,
					);
				}

				currentImageData = output;
				const previewUrl = await imageDataToDataUrl(
					currentImageData,
					"image/png",
				);
				results.value.push({
					stepId: step.id,
					stepTitle: getStepTitle(step, index),
					outputType: "image",
					previewUrl,
					meta:
						config.mode === "grabcut"
							? "Mode: grabcut | Rectangle selection"
							: `Mode: ${config.mode} | Tolerance: ${config.tolerance}`,
				});
				lastImageOutputUrl = previewUrl;
				lastMimeType = "image/png";
				previewImageUrl.value = previewUrl;
				continue;
			}

			const config = step.config as OcrConfig;
			const ocrInput = await imageDataToDataUrl(currentImageData, "image/png");
			const text = await tesseractApi.recognize(ocrInput, config.language);
			results.value.push({
				stepId: step.id,
				stepTitle: getStepTitle(step, index),
				outputType: "text",
				text,
				meta: `Language: ${config.language}`,
			});
			finalText.value = text;
			lastImageOutputUrl = "";
			previewImageUrl.value = null;
		}

		if (!finalText.value && lastImageOutputUrl) {
			finalImageUrl.value = lastImageOutputUrl;
			finalImageMimeType.value = lastMimeType;
		}
	} catch (error) {
		runError.value =
			error instanceof Error ? error.message : "Pipeline execution failed.";
	} finally {
		waitingForSampleStepId.value = null;
		waitingForGrabCutStepId.value = null;
		sampleResolver = null;
		grabCutResolver = null;
		runMessage.value = "";
		isProcessing.value = false;
	}
};

onMounted(() => {
	void initWebGPU();
	opencvWorker = new OpencvWorkerConstructor();
	opencvApi = Comlink.wrap<OpencvWorker>(opencvWorker);
	tesseractWorker = new TesseractWorkerConstructor();
	tesseractApi = Comlink.wrap<TesseractWorker>(tesseractWorker);

	addStep("resize");
});

onUnmounted(() => {
	if (sourceImageUrl.value) {
		URL.revokeObjectURL(sourceImageUrl.value);
	}
	sampleResolver = null;
	grabCutResolver = null;
	gpu = null;
	opencvWorker?.terminate();
	tesseractWorker?.terminate();
});
</script>

<template>
  <div>
    <ToolHeader
      title="Image Process Pipeline"
      description="Build a sequential image pipeline with resize, AI upscale (2x), convert, background removal, and OCR. Use + Add Process to extend the chain."
    />

    <div v-if="hasUpscaleStep && !isWebGPUAvailable" class="alert alert-warning mb-4">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      WebGPU is not available. Remove Image Upscale steps or use a WebGPU-supported browser/device.
    </div>

    <div class="row g-4">
      <div class="col-lg-6">
        <ToolCard title="Pipeline Builder" class="h-100">
          <div class="row g-2 mb-3 align-items-end">
            <div class="col-md-6">
              <label class="form-label fw-bold small">Next Process</label>
              <select v-model="nextProcessType" class="form-select form-select-sm">
                <option v-for="option in processTypeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div class="col-md-3 d-grid">
              <button class="btn btn-outline-primary btn-sm" type="button" @click="addStep()">
                + Add Process
              </button>
            </div>
            <div class="col-md-3 d-grid">
              <button class="btn btn-primary btn-sm" type="button" :disabled="!canRun" @click="runPipeline">
                <span v-if="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
                {{ isProcessing ? "Running" : "Run" }}
              </button>
            </div>
          </div>

          <div v-if="validationErrors.length > 0" class="alert alert-warning mb-3 py-2">
            <div class="fw-bold small text-uppercase">Pipeline Validation</div>
            <ul class="mb-0 small">
              <li v-for="error in validationErrors" :key="error">{{ error }}</li>
            </ul>
          </div>
          <div v-else class="small text-success mb-3">Pipeline is valid.</div>

          <div class="card mb-3 border-0 edge-step-card">
            <div class="card-body">
              <div class="fw-bold small text-uppercase text-muted mb-3">Step 0 - Input Image</div>
              <FilePicker label="Upload Source Image" accept="image/*" @change="handleFileChange" />
              <div v-if="sourceDetails" class="small text-muted font-monospace mt-2">
                {{ sourceDetails.width }} x {{ sourceDetails.height }} px
              </div>
            </div>
          </div>

          <div v-if="pipelineSteps.length === 0" class="text-muted small">Add process steps to build a pipeline.</div>

          <div v-for="(step, index) in pipelineSteps" :key="step.id" class="card mb-3 border-0 bg-light">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="fw-bold small text-uppercase text-muted">{{ getStepTitle(step, index) }}</span>
                <div class="btn-group btn-group-sm">
                  <button
                    class="btn btn-outline-secondary"
                    :disabled="index === 0"
                    type="button"
                    @click="moveStep(index, -1)"
                  >
                    ↑
                  </button>
                  <button
                    class="btn btn-outline-secondary"
                    :disabled="index === pipelineSteps.length - 1"
                    type="button"
                    @click="moveStep(index, 1)"
                  >
                    ↓
                  </button>
                  <button class="btn btn-outline-danger" type="button" @click="removeStep(index)">Remove</button>
                </div>
              </div>

              <div class="row g-3 align-items-end">
                <template v-if="step.type === 'resize'">
                  <div class="col-md-4">
                    <label class="form-label fw-bold small">Width</label>
                    <input v-model.number="(step.config as ResizeConfig).width" type="number" min="1" class="form-control form-control-sm" />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label fw-bold small">Height</label>
                    <input
                      v-model.number="(step.config as ResizeConfig).height"
                      :disabled="(step.config as ResizeConfig).keepAspectRatio"
                      type="number"
                      min="1"
                      class="form-control form-control-sm"
                    />
                  </div>
                  <div class="col-md-4">
                    <div class="form-check mt-4">
                      <input
                        :id="`keep-ratio-${step.id}`"
                        v-model="(step.config as ResizeConfig).keepAspectRatio"
                        class="form-check-input"
                        type="checkbox"
                      />
                      <label class="form-check-label small" :for="`keep-ratio-${step.id}`">Lock</label>
                    </div>
                  </div>
                </template>

                <template v-if="step.type === 'upscale'">
                  <div class="col-md-6">
                    <label class="form-label fw-bold small">Model Size</label>
                    <select v-model="(step.config as UpscaleConfig).size" class="form-select form-select-sm">
                      <option value="s">Small (Fastest)</option>
                      <option value="m">Medium</option>
                      <option value="l">Large (Best Quality)</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-bold small">Content Type</label>
                    <select v-model="(step.config as UpscaleConfig).type" class="form-select form-select-sm">
                      <option value="an">Anime / Illustration</option>
                      <option value="rl">Real Life (Photo)</option>
                      <option value="3d">3D / CGI / Gaming</option>
                    </select>
                  </div>
                </template>

                <template v-if="step.type === 'convert'">
                  <div class="col-md-6">
                    <label class="form-label fw-bold small">Format</label>
                    <select v-model="(step.config as ConvertConfig).format" class="form-select form-select-sm">
                      <option value="image/png">PNG</option>
                      <option value="image/jpeg">JPEG</option>
                      <option value="image/webp">WebP</option>
                    </select>
                  </div>
                  <div class="col-md-6" v-if="isLossyFormat((step.config as ConvertConfig).format)">
                    <label class="form-label fw-bold small">
                      Quality ({{ Math.round((step.config as ConvertConfig).quality * 100) }}%)
                    </label>
                    <input
                      v-model.number="(step.config as ConvertConfig).quality"
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.01"
                      class="form-range"
                    />
                  </div>
                </template>

                <template v-if="step.type === 'bg-remover'">
                  <div class="col-md-6">
                    <label class="form-label fw-bold small">Mode</label>
                    <select v-model="(step.config as BgRemoverConfig).mode" class="form-select form-select-sm">
                      <option value="magic">Magic Wand</option>
                      <option value="global">Global Color</option>
                      <option value="grabcut">GrabCut</option>
                    </select>
                  </div>

                  <div class="col-md-6" v-if="(step.config as BgRemoverConfig).mode !== 'grabcut'">
                    <label class="form-label fw-bold small">Tolerance</label>
                    <input
                      v-model.number="(step.config as BgRemoverConfig).tolerance"
                      type="range"
                      min="1"
                      max="150"
                      class="form-range"
                    />
                  </div>

                  <div v-else class="col-md-6 small text-muted">
                    GrabCut will pause during run and use a graphical rectangle selector on the current preview.
                  </div>
                </template>

                <template v-if="step.type === 'ocr'">
                  <div class="col-md-6">
                    <label class="form-label fw-bold small">Language</label>
                    <select v-model="(step.config as OcrConfig).language" class="form-select form-select-sm">
                      <option v-for="lang in supportedLanguages" :key="lang.code" :value="lang.code">
                        {{ lang.name }}
                      </option>
                    </select>
                  </div>
                  <div class="col-md-6 small text-muted">
                    OCR converts the image into text output. No image process can follow this step.
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="card border-0 edge-step-card">
            <div class="card-body">
              <div class="fw-bold small text-uppercase text-muted mb-3">Final Step - Output</div>
              <label class="form-label fw-bold small">Download As</label>
              <input
                v-model.trim="downloadAs"
                type="text"
                class="form-control form-control-sm font-monospace"
                placeholder="pipeline-output"
              />
              <div class="small text-muted mt-2 font-monospace">
                Final file: {{ finalFileName }}
              </div>
            </div>
          </div>
        </ToolCard>
      </div>

      <div class="col-lg-6">
        <ToolCard title="Workspace & Output" class="h-100">
          <template #header-actions>
            <DownloadLink
              v-if="outputMode === 'image' && finalImageUrl"
              :href="finalImageUrl"
              :filename="finalFileName"
              label="Download"
            />
          </template>

          <div class="mb-3">
            <div class="fw-bold small text-uppercase text-muted mb-2">Current Preview</div>
            <div
              class="border rounded bg-light p-2 d-flex justify-content-center align-items-center overflow-hidden"
              style="min-height: 240px; max-height: 380px"
            >
              <ImageCropper
                v-if="waitingForGrabCutStepId && (previewImageUrl || sourceImageUrl)"
                ref="grabCutCropper"
                :src="(previewImageUrl || sourceImageUrl) as string"
                class="pipeline-preview-cropper"
              />
              <img
                v-else-if="previewImageUrl || sourceImageUrl"
                :src="previewImageUrl || sourceImageUrl"
                class="pipeline-preview-media"
                :style="{ cursor: waitingForSampleStepId ? 'crosshair' : 'default' }"
                alt="Source"
                @click="handlePreviewClick"
              />
              <span v-else class="small text-muted">Upload an image to start.</span>
            </div>
            <div v-if="waitingForGrabCutStepId" class="d-grid mt-2">
              <button class="btn btn-primary btn-sm" type="button" @click="applyGrabCutRectangle">
                Apply Rectangle
              </button>
            </div>
            <div v-if="waitingForSampleStepId" class="small text-primary mt-2">
              Click the preview image to choose a background sample point and continue.
            </div>
            <div v-if="waitingForGrabCutStepId" class="small text-primary mt-2">
              Adjust the rectangle on preview and click Apply Rectangle.
            </div>
          </div>

          <div v-if="runError" class="alert alert-danger py-2 small">{{ runError }}</div>
          <div v-if="runMessage" class="alert alert-info py-2 small">{{ runMessage }}</div>

          <div v-if="results.length > 0" class="fw-bold small text-uppercase text-muted mb-2">Step Results</div>
          <div v-for="result in results" :key="result.stepId" class="border rounded mb-3 p-2 bg-light">
            <div class="d-flex justify-content-between mb-2">
              <div class="small fw-bold text-uppercase">{{ result.stepTitle }}</div>
              <div class="small text-muted font-monospace">{{ result.meta }}</div>
            </div>

            <div v-if="result.outputType === 'image'" class="text-center">
              <img :src="result.previewUrl" class="img-fluid border rounded" style="max-height: 220px" alt="Step output" />
            </div>

            <div v-else>
              <MonospaceEditor
                :model-value="result.text || ''"
                bg-light
                readonly
                style="min-height: 180px"
                placeholder="OCR output"
              />
            </div>
          </div>

          <div v-if="outputMode === 'text'" class="mt-3">
            <div class="fw-bold small text-uppercase text-muted mb-2">Final Text Output</div>
            <MonospaceEditor v-model="finalText" bg-light readonly style="min-height: 220px" />
          </div>

          <div v-if="outputMode === 'none'" class="small text-muted">Run the pipeline to generate output.</div>
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pipeline-preview-media {
	max-width: 100%;
	max-height: 360px;
	width: auto;
	height: auto;
	object-fit: contain;
}

.pipeline-preview-cropper {
	max-width: 100%;
	max-height: 360px;
	width: auto;
	height: auto;
}

.pipeline-preview-cropper :deep(.image-cropper-container) {
	background: transparent;
	height: auto;
}

.pipeline-preview-cropper :deep(.cropper-image) {
	max-height: 360px;
	width: auto;
	height: auto;
	object-fit: contain;
}

.edge-step-card {
	--bs-card-bg: #e3e8ec;
	border: 1px solid #d3dae0 !important;
}
</style>
