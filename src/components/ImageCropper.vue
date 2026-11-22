<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from "vue";

const props = defineProps<{
	src: string;
	aspectRatio?: number;
}>();

const emit = defineEmits<{
	change: [
		result: { canvas: HTMLCanvasElement | null; coordinates: Coordinates },
	];
}>();

interface Coordinates {
	left: number;
	top: number;
	width: number;
	height: number;
}

const containerRef = ref<HTMLDivElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);

const state = reactive({
	imgWidth: 0,
	imgHeight: 0,
	displayLeft: 0,
	displayTop: 0,
	displayWidth: 0,
	displayHeight: 0,
	crop: {
		left: 0,
		top: 0,
		width: 0,
		height: 0,
	} as Coordinates,
});

const isDragging = ref(false);
const dragType = ref<string | null>(null);
const startPos = { x: 0, y: 0 };
const startCrop = { ...state.crop };

const initCrop = () => {
	if (!imageRef.value) return;
	const { naturalWidth, naturalHeight } = imageRef.value;
	state.imgWidth = naturalWidth;
	state.imgHeight = naturalHeight;

	const rect = imageRef.value.getBoundingClientRect();
	state.displayWidth = rect.width;
	state.displayHeight = rect.height;

	// Initial crop: 80% of the image
	const cropW = state.displayWidth * 0.8;
	const cropH = props.aspectRatio
		? cropW / props.aspectRatio
		: state.displayHeight * 0.8;

	state.crop = {
		left: (state.displayWidth - cropW) / 2,
		top: (state.displayHeight - cropH) / 2,
		width: cropW,
		height: cropH,
	};

	triggerChange();
};

const triggerChange = () => {
	const canvas = getResultCanvas();
	const scaleX = state.imgWidth / state.displayWidth;
	const scaleY = state.imgHeight / state.displayHeight;

	const coords: Coordinates = {
		left: state.crop.left * scaleX,
		top: state.crop.top * scaleY,
		width: state.crop.width * scaleX,
		height: state.crop.height * scaleY,
	};

	emit("change", { canvas, coordinates: coords });
};

const getResultCanvas = () => {
	if (!imageRef.value) return null;
	const scaleX = state.imgWidth / state.displayWidth;
	const scaleY = state.imgHeight / state.displayHeight;

	const canvas = document.createElement("canvas");
	canvas.width = state.crop.width * scaleX;
	canvas.height = state.crop.height * scaleY;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.drawImage(
			imageRef.value,
			state.crop.left * scaleX,
			state.crop.top * scaleY,
			state.crop.width * scaleX,
			state.crop.height * scaleY,
			0,
			0,
			canvas.width,
			canvas.height,
		);
	}
	return canvas;
};

defineExpose({
	getResult: () => {
		const canvas = getResultCanvas();
		const scaleX = state.imgWidth / state.displayWidth;
		const scaleY = state.imgHeight / state.displayHeight;
		return {
			canvas,
			coordinates: {
				left: state.crop.left * scaleX,
				top: state.crop.top * scaleY,
				width: state.crop.width * scaleX,
				height: state.crop.height * scaleY,
			},
		};
	},
});

const onMouseDown = (e: MouseEvent, type: string) => {
	e.preventDefault();
	isDragging.value = true;
	dragType.value = type;
	startPos.x = e.clientX;
	startPos.y = e.clientY;
	startCrop.left = state.crop.left;
	startCrop.top = state.crop.top;
	startCrop.width = state.crop.width;
	startCrop.height = state.crop.height;

	window.addEventListener("mousemove", onMouseMove);
	window.addEventListener("mouseup", onMouseUp);
};

const onMouseMove = (e: MouseEvent) => {
	if (!isDragging.value) return;

	const dx = e.clientX - startPos.x;
	const dy = e.clientY - startPos.y;

	let newCrop = { ...startCrop };

	if (dragType.value === "move") {
		newCrop.left = Math.max(
			0,
			Math.min(state.displayWidth - startCrop.width, startCrop.left + dx),
		);
		newCrop.top = Math.max(
			0,
			Math.min(state.displayHeight - startCrop.height, startCrop.top + dy),
		);
	} else {
		// Handles
		if (dragType.value?.includes("right")) {
			newCrop.width = Math.max(
				20,
				Math.min(state.displayWidth - startCrop.left, startCrop.width + dx),
			);
		}
		if (dragType.value?.includes("bottom")) {
			newCrop.height = Math.max(
				20,
				Math.min(state.displayHeight - startCrop.top, startCrop.height + dy),
			);
		}
		if (dragType.value?.includes("left")) {
			const maxDx = startCrop.width - 20;
			const effectiveDx = Math.max(-startCrop.left, Math.min(maxDx, dx));
			newCrop.left = startCrop.left + effectiveDx;
			newCrop.width = startCrop.width - effectiveDx;
		}
		if (dragType.value?.includes("top")) {
			const maxDy = startCrop.height - 20;
			const effectiveDy = Math.max(-startCrop.top, Math.min(maxDy, dy));
			newCrop.top = startCrop.top + effectiveDy;
			newCrop.height = startCrop.height - effectiveDy;
		}

		if (props.aspectRatio) {
			// Enforce aspect ratio
			if (
				dragType.value?.includes("right") ||
				dragType.value?.includes("left")
			) {
				newCrop.height = newCrop.width / props.aspectRatio;
			} else {
				newCrop.width = newCrop.height * props.aspectRatio;
			}

			// Bounds check for aspect ratio enforcement
			if (newCrop.top + newCrop.height > state.displayHeight) {
				newCrop.height = state.displayHeight - newCrop.top;
				newCrop.width = newCrop.height * props.aspectRatio;
			}
			if (newCrop.left + newCrop.width > state.displayWidth) {
				newCrop.width = state.displayWidth - newCrop.left;
				newCrop.height = newCrop.width / props.aspectRatio;
			}
		}
	}

	state.crop = newCrop;
	triggerChange();
};

const onMouseUp = () => {
	isDragging.value = false;
	dragType.value = null;
	window.removeEventListener("mousemove", onMouseMove);
	window.removeEventListener("mouseup", onMouseUp);
};

watch(
	() => props.src,
	() => {
		// Wait for image to load
	},
);

onUnmounted(() => {
	window.removeEventListener("mousemove", onMouseMove);
	window.removeEventListener("mouseup", onMouseUp);
});
</script>

<template>
	<div ref="containerRef" class="image-cropper-container">
		<div class="image-wrapper">
			<img
				ref="imageRef"
				:src="props.src"
				@load="initCrop"
				class="cropper-image"
				draggable="false"
			/>

			<div
				v-if="state.displayWidth > 0"
				class="crop-overlay"
				:style="{
					left: state.crop.left + 'px',
					top: state.crop.top + 'px',
					width: state.crop.width + 'px',
					height: state.crop.height + 'px',
				}"
			>
				<div class="crop-box-content" @mousedown="onMouseDown($event, 'move')">
					<div class="crop-grid">
						<div></div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
					</div>
				</div>

				<!-- Handles -->
				<div
					class="handle handle-tl"
					@mousedown="onMouseDown($event, 'topleft')"
				></div>
				<div
					class="handle handle-tr"
					@mousedown="onMouseDown($event, 'topright')"
				></div>
				<div
					class="handle handle-bl"
					@mousedown="onMouseDown($event, 'bottomleft')"
				></div>
				<div
					class="handle handle-br"
					@mousedown="onMouseDown($event, 'bottomright')"
				></div>
				<div
					class="handle handle-t"
					@mousedown="onMouseDown($event, 'top')"
				></div>
				<div
					class="handle handle-b"
					@mousedown="onMouseDown($event, 'bottom')"
				></div>
				<div
					class="handle handle-l"
					@mousedown="onMouseDown($event, 'left')"
				></div>
				<div
					class="handle handle-r"
					@mousedown="onMouseDown($event, 'right')"
				></div>
			</div>

			<!-- Shroud -->
			<div
				class="shroud shroud-t"
				:style="{ height: state.crop.top + 'px' }"
			></div>
			<div
				class="shroud shroud-b"
				:style="{ top: state.crop.top + state.crop.height + 'px' }"
			></div>
			<div
				class="shroud shroud-l"
				:style="{
					top: state.crop.top + 'px',
					height: state.crop.height + 'px',
					width: state.crop.left + 'px',
				}"
			></div>
			<div
				class="shroud shroud-r"
				:style="{
					top: state.crop.top + 'px',
					height: state.crop.height + 'px',
					left: state.crop.left + state.crop.width + 'px',
				}"
			></div>
		</div>
	</div>
</template>

<style scoped>
.image-cropper-container {
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background: #f0f0f0;
	user-select: none;
}

.image-wrapper {
	position: relative;
	display: inline-block;
	line-height: 0;
}

.cropper-image {
	max-width: 100%;
	max-height: 500px;
	display: block;
}

.crop-overlay {
	position: absolute;
	border: 1px solid #fff;
	box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
	cursor: move;
	z-index: 10;
}

.crop-box-content {
	width: 100%;
	height: 100%;
	position: relative;
}

.crop-grid {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
	grid-template-rows: 1fr 1fr 1fr;
	width: 100%;
	height: 100%;
	pointer-events: none;
}

.crop-grid div {
	border: 0.5px dashed rgba(255, 255, 255, 0.5);
}

.handle {
	position: absolute;
	width: 10px;
	height: 10px;
	background: #fff;
	border: 1px solid #000;
	z-index: 11;
}

.handle-tl {
	top: -5px;
	left: -5px;
	cursor: nwse-resize;
}
.handle-tr {
	top: -5px;
	right: -5px;
	cursor: nesw-resize;
}
.handle-bl {
	bottom: -5px;
	left: -5px;
	cursor: nesw-resize;
}
.handle-br {
	bottom: -5px;
	right: -5px;
	cursor: nwse-resize;
}
.handle-t {
	top: -5px;
	left: calc(50% - 5px);
	cursor: ns-resize;
}
.handle-b {
	bottom: -5px;
	left: calc(50% - 5px);
	cursor: ns-resize;
}
.handle-l {
	top: calc(50% - 5px);
	left: -5px;
	cursor: ew-resize;
}
.handle-r {
	top: calc(50% - 5px);
	right: -5px;
	cursor: ew-resize;
}

.shroud {
	position: absolute;
	background: rgba(0, 0, 0, 0.5);
	pointer-events: none;
	z-index: 5;
	left: 0;
	right: 0;
}
.shroud-t {
	top: 0;
}
.shroud-b {
	bottom: 0;
}
.shroud-l {
	left: 0;
}
.shroud-r {
	right: 0;
}
</style>
