<script setup lang="ts">
import { type Engine, Graphviz } from "@hpcc-js/wasm-graphviz";
import { onWatcherCleanup, ref, watch } from "vue";
import DownloadLink from "../components/DownloadLink.vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const DEFAULT_CODE = `digraph G {
    node [shape=box, style=filled, color=lightblue];
    Graphviz -> PNG;
    PNG -> "Live Sync";
    "Live Sync" -> Graphviz;
}`;

async function convertSvgToPng(svgString: string, scale = 2) {
	const parser = new DOMParser();
	const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
	const svgElement = svgDoc.documentElement;

	const widthAttr = svgElement.getAttribute("width");
	const heightAttr = svgElement.getAttribute("height");
	let width = widthAttr ? parseFloat(widthAttr) : 0;
	let height = heightAttr ? parseFloat(heightAttr) : 0;

	if (!width || !height) {
		const viewBox = svgElement.getAttribute("viewBox");
		if (viewBox) {
			const [, , vbWidth, vbHeight] = viewBox.split(/\s+|,/).map(parseFloat);
			width = vbWidth;
			height = vbHeight;
		}
	}

	width = width || 800;
	height = height || 600;

	const canvas = document.createElement("canvas");
	canvas.width = Math.ceil(width * scale);
	canvas.height = Math.ceil(height * scale);

	const img = new Image();
	const base64Svg = btoa(unescape(encodeURIComponent(svgString)));

	await new Promise((resolve, reject) => {
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = `data:image/svg+xml;base64,${base64Svg}`;
	});

	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	}

	return canvas.toDataURL("image/png");
}

const engines: Engine[] = [
	"circo",
	"dot",
	"fdp",
	"neato",
	"osage",
	"patchwork",
	"twopi",
];

const code = ref(DEFAULT_CODE);
const engine = ref<Engine>("dot");
const imageUrl = ref("");
const error = ref("");
const isRendering = ref(false);
let lastRenderId = 0;
let graphviz: Graphviz | null = null;

const renderDiagram = async (dotCode: string) => {
	const currentRenderId = ++lastRenderId;

	if (!dotCode.trim()) {
		imageUrl.value = "";
		error.value = "";
		isRendering.value = false;
		return;
	}

	isRendering.value = true;

	try {
		if (!graphviz) {
			graphviz = await Graphviz.load();
		}

		if (currentRenderId !== lastRenderId) return;

		const svg = graphviz.layout(dotCode, "svg", engine.value);

		if (currentRenderId !== lastRenderId) return;

		const pngUrl = await convertSvgToPng(svg);

		if (currentRenderId !== lastRenderId) return;

		imageUrl.value = pngUrl;
		error.value = "";
	} catch (err) {
		if (currentRenderId !== lastRenderId) return;
		console.error("Graphviz Render Error:", err);
		const message =
			err instanceof Error ? err.message : "Invalid Graphviz syntax";
		error.value = message;
		imageUrl.value = "";
	} finally {
		if (currentRenderId === lastRenderId) {
			isRendering.value = false;
		}
	}
};

watch(
	[code, engine],
	([newCode], oldValue) => {
		if (oldValue === undefined) {
			renderDiagram(newCode);
			return;
		}

		const timer = setTimeout(() => {
			renderDiagram(newCode);
		}, 500);
		onWatcherCleanup(() => clearTimeout(timer));
	},
	{ immediate: true },
);
</script>

<template>
	<div class="graphviz-editor">
		<ToolHeader
			title="Graphviz"
			description="Create and preview diagrams using DOT syntax and export them as PNG images."
		/>

		<div class="row">
			<div class="col-lg-6 mb-4">
				<ToolCard title="DOT Code" class="h-100" no-padding>
					<template #header-actions>
						<select
							v-model="engine"
							class="form-select form-select-sm"
							style="width: auto"
							title="Rendering Engine"
						>
							<option v-for="e in engines" :key="e" :value="e">{{ e }}</option>
						</select>
					</template>
					<MonospaceEditor
						v-model="code"
						language="dot"
						:rows="15"
						placeholder="digraph G { A -> B; }"
					/>
				</ToolCard>
			</div>
			<div class="col-lg-6 mb-4">
				<ToolCard title="Preview" class="h-100" no-padding>
					<template #header-actions>
						<DownloadLink
							:href="imageUrl"
							filename="graphviz-diagram.png"
							label="Download PNG"
						/>
					</template>
					<div
						class="preview-container border-0 rounded-0 bg-light d-flex align-items-center justify-content-center"
						style="min-height: 382px"
					>
						<div v-if="!code" class="text-muted small">
							Please enter DOT code
						</div>

						<LoadingOverlay
							v-else-if="isRendering"
							:loading="true"
							message="Rendering..."
						/>

						<div
							v-else-if="error"
							class="alert alert-danger m-3 text-start small w-100"
						>
							<strong>Error:</strong> <span>{{ error }}</span>
						</div>

						<img
							v-else-if="imageUrl"
							:src="imageUrl"
							class="img-fluid p-3"
							alt="Rendered Diagram"
							title="Right click to save"
						/>
					</div>
				</ToolCard>
			</div>
		</div>
	</div>
</template>

<style scoped>
.preview-container {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 400px;
	border: solid 1px #ccc;
	border-radius: 5px;
	overflow: auto;
	background-color: white;
}
</style>
