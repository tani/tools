<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef } from "vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const preview = useTemplateRef<HTMLVideoElement>("preview");
const phase = ref<"idle" | "starting" | "live">("idle");
const error = ref("");
let stream: MediaStream | null = null;
let requestId = 0;

const buttonLabels = {
	idle: "Start camera",
	starting: "Cancel",
	live: "Stop camera",
};

function stopCamera() {
	requestId++;
	for (const track of stream?.getTracks() ?? []) track.stop();
	stream = null;
	if (preview.value) preview.value.srcObject = null;
	phase.value = "idle";
}

function cameraError(cause: unknown) {
	switch (cause instanceof DOMException ? cause.name : "") {
		case "NotAllowedError":
			return "Allow camera access in your browser and try again.";
		case "NotFoundError":
			return "No camera was found. Connect a camera and try again.";
		case "NotReadableError":
			return "The camera is unavailable. Close other apps using it and try again.";
		default:
			return "Could not start the camera. Try again.";
	}
}

async function startCamera() {
	const video = preview.value;
	if (!video || phase.value !== "idle") return;

	error.value = "";
	if (!navigator.mediaDevices?.getUserMedia) {
		error.value = window.isSecureContext
			? "Camera access is unavailable in this browser."
			: "Open Mirror over HTTPS or localhost to use your camera.";
		return;
	}

	const currentRequest = ++requestId;
	phase.value = "starting";
	try {
		const camera = await navigator.mediaDevices.getUserMedia({
			audio: false,
			video: { facingMode: { ideal: "user" } },
		});
		if (currentRequest !== requestId) {
			for (const track of camera.getTracks()) track.stop();
			return;
		}

		stream = camera;
		for (const track of camera.getVideoTracks()) {
			track.addEventListener(
				"ended",
				() => {
					if (currentRequest !== requestId) return;
					stopCamera();
					error.value = "The camera stopped. Start it again to resume.";
				},
				{ once: true },
			);
		}
		video.srcObject = camera;
		await video.play();
		if (currentRequest === requestId) phase.value = "live";
	} catch (cause) {
		if (currentRequest !== requestId) return;
		const openingCamera = stream === null;
		stopCamera();
		error.value = openingCamera
			? cameraError(cause)
			: "Could not play the camera preview. Try again.";
	}
}

onBeforeUnmount(stopCamera);
</script>

<template>
	<div>
		<ToolHeader
			title="Mirror"
			description="Use your webcam as a live mirror."
		/>
		<div v-if="error" class="alert alert-warning" role="alert">{{ error }}</div>
		<ToolCard title="Camera preview" no-padding>
			<template #header-actions>
				<button
					type="button"
					class="btn btn-sm"
					:class="phase === 'idle' ? 'btn-primary' : 'btn-outline-secondary'"
					@click="phase === 'idle' ? startCamera() : stopCamera()"
				>
					{{ buttonLabels[phase] }}
				</button>
			</template>
			<div class="mirror-preview bg-light overflow-hidden">
				<video
					v-show="phase !== 'idle'"
					ref="preview"
					class="mirror-video"
					aria-label="Mirrored webcam preview"
					muted
					playsinline
				></video>
				<p v-if="phase !== 'live'" class="m-0 p-3 text-muted" role="status">
					{{ phase === "starting" ? "Waiting for camera…" : "Camera is off." }}
				</p>
			</div>
		</ToolCard>
	</div>
</template>

<style scoped>
.mirror-preview {
	display: grid;
	place-items: center;
	min-height: min(48vh, 22rem);
}

.mirror-preview > * {
	grid-area: 1 / 1;
}

.mirror-video {
	display: block;
	width: 100%;
	max-height: 72vh;
	object-fit: contain;
	transform: scaleX(-1);
}
</style>
