<script setup lang="ts">
import * as gifenc from "gifenc";
import { computed, onUnmounted, ref } from "vue";
import FilePicker from "../components/FilePicker.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const file = ref<File | null>(null);
const videoUrl = ref<string>("");
const videoElement = ref<HTMLVideoElement | null>(null);
const duration = ref(0);
const startTime = ref(0);
const endTime = ref(0);
const processing = ref(false);
const progress = ref(0);
const status = ref("");
const resultUrl = ref("");
const error = ref("");
const resultSize = ref(0);
const downloadName = ref("");
const maxWidth = ref(480);
const frameRate = ref(10);

const selectedFileLabel = computed(() => {
	if (!file.value) return "No file selected yet";
	return `${file.value.name} (${formatBytes(file.value.size)})`;
});

const hasPreview = computed(() => Boolean(videoUrl.value || resultUrl.value));

const formatTime = (seconds: number) => {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	const ms = Math.floor((seconds % 1) * 100);
	return `${h.toString().padStart(2, "0")}:${m
		.toString()
		.padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms
		.toString()
		.padStart(2, "0")}`;
};

const formatBytes = (bytes: number) => {
	if (bytes === 0) return "0 B";
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = bytes / 1024 ** i;
	return `${value.toFixed(value >= 10 ? 0 : 1)} ${sizes[i]}`;
};

const handleFileChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	if (target.files && target.files.length > 0) {
		file.value = target.files[0];
		if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
		if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
		videoUrl.value = URL.createObjectURL(file.value);
		resultUrl.value = "";
		error.value = "";
		progress.value = 0;
		status.value = "";
		resultSize.value = 0;
		downloadName.value = "";
	}
};

const onMetadataLoaded = () => {
	if (videoElement.value) {
		duration.value = videoElement.value.duration;
		startTime.value = 0;
		endTime.value = Math.min(duration.value, 5); // Default 5 seconds
	}
};

const setStartToCurrent = () => {
	if (videoElement.value) startTime.value = videoElement.value.currentTime;
};

const setEndToCurrent = () => {
	if (videoElement.value) endTime.value = videoElement.value.currentTime;
};

onUnmounted(() => {
	if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
	if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
});

const waitForEvent = (target: EventTarget, event: string) =>
	new Promise<void>((resolve) => {
		const handler = () => {
			target.removeEventListener(event, handler);
			resolve();
		};
		target.addEventListener(event, handler, { once: true });
	});

const seekTo = async (video: HTMLVideoElement, time: number) => {
	const clamped = Math.min(Math.max(time, 0), video.duration || time);
	if (Math.abs(video.currentTime - clamped) < 0.001) {
		return;
	}
	const seeked = waitForEvent(video, "seeked");
	video.currentTime = clamped;
	await seeked;
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
};

const convertToGif = async () => {
	if (!file.value) return;
	processing.value = true;
	error.value = "";
	progress.value = 0;
	status.value = "Initializing...";
	if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
	resultUrl.value = "";
	resultSize.value = 0;
	downloadName.value = "";

	try {
		const video = videoElement.value;
		if (!video) throw new Error("Video element not ready.");
		if (video.readyState < 1) {
			await waitForEvent(video, "loadedmetadata");
		}
		if (!video.videoWidth || !video.videoHeight) {
			throw new Error("Unable to read video dimensions.");
		}
		const selectedStart = Math.max(0, startTime.value);
		const selectedEnd = Math.min(
			endTime.value,
			video.duration || endTime.value,
		);
		if (selectedEnd <= selectedStart) {
			throw new Error("End time must be greater than start time.");
		}

		const safeMaxWidth = Math.min(
			video.videoWidth,
			Math.max(16, Math.round(maxWidth.value)),
		);
		const safeFrameRate = Math.min(
			60,
			Math.max(1, Math.round(frameRate.value)),
		);
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) throw new Error("Could not get canvas context");

		const gifWidth = safeMaxWidth;
		const gifHeight = Math.round(
			(gifWidth / video.videoWidth) * video.videoHeight,
		);
		canvas.width = gifWidth;
		canvas.height = gifHeight;

		const writer = gifenc.GIFEncoder();
		const totalFrames = Math.max(
			1,
			Math.ceil((selectedEnd - selectedStart) * safeFrameRate),
		);
		const frameStep = (selectedEnd - selectedStart) / totalFrames;
		const delay = Math.max(1, Math.round(1000 / safeFrameRate));

		status.value = `Processing ${totalFrames} frames...`;

		for (let i = 0; i < totalFrames; i++) {
			const time = selectedStart + i * frameStep;
			await seekTo(video, time);

			const frame = new VideoFrame(video);
			ctx.drawImage(frame, 0, 0, gifWidth, gifHeight);
			frame.close();

			const imageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
			const rgba = imageData.data;
			const palette = gifenc.quantize(rgba, 256);
			const index = gifenc.applyPalette(rgba, palette);

			writer.writeFrame(index, gifWidth, gifHeight, {
				palette,
				delay,
				transparent: false,
			});

			progress.value = Math.round(((i + 1) / totalFrames) * 100);
			if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
		}

		writer.finish();
		const gifBytes = writer.bytesView();

		if (gifBytes.length === 0) {
			throw new Error("Generated GIF is empty.");
		}

		const blob = new Blob([gifBytes], {
			type: "image/gif",
		});
		resultUrl.value = URL.createObjectURL(blob);
		resultSize.value = blob.size;
		downloadName.value = `converted-${file.value?.name.replace(/\.[^/.]+$/, "") || "video"}.gif`;
		status.value = "Done!";
	} catch (err: unknown) {
		console.error(err);
		error.value = err instanceof Error ? err.message : String(err);
	} finally {
		processing.value = false;
	}
};
</script>

<template>
	<div>
		<ToolHeader
			title="GIF Converter"
			description="Convert video files to animated GIFs using WebCodecs and gifenc."
		/>

		<ToolCard title="Configuration" class="mb-4">
			<div class="row g-3 align-items-end">
				<div class="col-lg-4">
					<label class="form-label fw-bold small text-uppercase text-muted"
						>Upload video</label
					>
					<FilePicker
						label="Select Video"
						accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*"
						@change="handleFileChange"
						:disabled="processing"
					/>
					<div class="form-text">
						Pick a video to convert into an animated GIF.
					</div>
				</div>

				<div class="col-lg-4">
					<label class="form-label small text-muted fw-bold text-uppercase"
						>Start time</label
					>
					<div class="input-group">
						<input
							type="number"
							class="form-control"
							v-model.number="startTime"
							:max="endTime"
							min="0"
							step="0.1"
							:disabled="processing"
						/>
						<button
							class="btn btn-outline-secondary"
							type="button"
							@click="setStartToCurrent"
							:disabled="processing"
						>
							Use Current
						</button>
					</div>
					<div class="form-text">{{ formatTime(startTime) }}</div>
				</div>

				<div class="col-lg-4">
					<label class="form-label small text-muted fw-bold text-uppercase"
						>End time</label
					>
					<div class="input-group">
						<input
							type="number"
							class="form-control"
							v-model.number="endTime"
							:min="startTime"
							:max="duration"
							step="0.1"
							:disabled="processing"
						/>
						<button
							class="btn btn-outline-secondary"
							type="button"
							@click="setEndToCurrent"
							:disabled="processing"
						>
							Use Current
						</button>
					</div>
					<div class="form-text">{{ formatTime(endTime) }}</div>
				</div>
			</div>

			<div class="row g-3 mt-1 align-items-end">
				<div class="col-lg-4">
					<label class="form-label fw-bold small text-uppercase text-muted"
						>Max width (px)</label
					>
					<input
						type="number"
						class="form-control"
						v-model.number="maxWidth"
						min="16"
						max="4096"
						step="1"
						:disabled="processing"
					/>
					<div class="form-text">Maintains aspect ratio.</div>
				</div>

				<div class="col-lg-4">
					<label class="form-label fw-bold small text-uppercase text-muted"
						>Frame rate (fps)</label
					>
					<input
						type="number"
						class="form-control"
						v-model.number="frameRate"
						min="1"
						max="60"
						step="1"
						:disabled="processing"
					/>
					<div class="form-text">Higher values increase size.</div>
				</div>

				<div class="col-lg-4">
					<button
						class="btn btn-primary w-100"
						@click="convertToGif"
						:disabled="processing || !videoUrl"
					>
						Convert to GIF
					</button>
					<div class="form-text">&nbsp;</div>
				</div>
			</div>

			<div v-if="processing" class="mt-3">
				<div class="progress" style="height: 1.5rem">
					<div
						class="progress-bar progress-bar-striped progress-bar-animated"
						role="progressbar"
						:style="{ width: progress + '%' }"
						:aria-valuenow="progress"
						aria-valuemin="0"
						aria-valuemax="100"
					>
						{{ progress }}%
					</div>
				</div>
			</div>

			<div class="d-flex flex-wrap gap-3 mt-3 align-items-center">
				<span class="badge bg-light text-dark border">{{
					selectedFileLabel
				}}</span>
				<span v-if="resultUrl" class="badge bg-light text-dark border">
					GIF size: {{ formatBytes(resultSize) }}
				</span>
				<span v-if="processing" class="badge bg-warning text-dark"
					>Processing…</span
				>
				<span v-if="status" class="badge bg-secondary opacity-75">{{
					status
				}}</span>
			</div>
		</ToolCard>

		<div v-if="error" class="alert alert-danger" role="alert">
			{{ error }}
		</div>

		<div class="row">
			<div class="col-lg-6 mb-4">
				<ToolCard title="Source preview" class="h-100">
					<template #header-actions>
						<span class="badge bg-secondary opacity-75" v-if="videoUrl">
							{{ formatTime(duration) }}
						</span>
					</template>
					<div v-if="videoUrl" class="ratio ratio-16x9 bg-black rounded">
						<video
							ref="videoElement"
							:src="videoUrl"
							controls
							@loadedmetadata="onMetadataLoaded"
							class="w-100 h-100"
						></video>
					</div>
					<div v-else class="text-muted small text-center py-5">
						Upload a video to preview the source clip.
					</div>
				</ToolCard>
			</div>

			<div class="col-lg-6 mb-4">
				<ToolCard title="GIF preview" class="h-100">
					<template #header-actions>
						<div class="d-flex align-items-center gap-3" v-if="resultUrl">
							<a
								class="btn btn-sm btn-link p-0 text-decoration-none"
								:href="resultUrl"
								:download="downloadName"
							>
								Download
							</a>
							<span class="badge bg-secondary opacity-75">
								{{ formatBytes(resultSize) }}
							</span>
						</div>
					</template>
					<div v-if="resultUrl" class="text-center">
						<img
							:src="resultUrl"
							alt="GIF preview"
							class="img-fluid rounded border"
						/>
					</div>
					<div v-else class="text-muted small text-center py-5">
						Convert a clip to see the GIF preview here.
					</div>
				</ToolCard>
			</div>
		</div>

		<div v-if="!hasPreview" class="text-center text-muted py-4">
			Upload a video to start converting it into a GIF.
		</div>
	</div>
</template>
