<script setup lang="ts">
import { ref, watch, onWatcherCleanup } from "vue";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: '"Noto Sans JP", "Helvetica Neue", Arial, sans-serif',
});

const DEFAULT_CODE = `graph TD
    A[ユーザー] -->|入力| B(Vue)
    B -->|監視| C{変更あり?}
    C -->|Yes| D["generateSvg()"]
    D -->|SVG文字列| E["getDimensions()"]
    E -->|サイズ| F["createCanvas()"]
    F -->|Context| G["drawToCanvas()"]
    G -->|PNG Data| H[画像表示]
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style H fill:#bbf,stroke:#333,stroke-width:2px`;

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
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  return canvas.toDataURL("image/png");
}

const code = ref(DEFAULT_CODE);
const imageUrl = ref("");
const error = ref("");
const isRendering = ref(false);
let lastRenderId = 0;

const renderDiagram = async (mermaidCode: string) => {
  const currentRenderId = ++lastRenderId;

  if (!mermaidCode.trim()) {
    imageUrl.value = "";
    error.value = "";
    isRendering.value = false;
    return;
  }

  isRendering.value = true;

  try {
    await mermaid.parse(mermaidCode, { suppressErrors: false });

    const id = `mermaid-${Date.now()}`;
    const { svg } = await mermaid.render(id, mermaidCode);

    if (currentRenderId !== lastRenderId) return;

    const pngUrl = await convertSvgToPng(svg);

    if (currentRenderId !== lastRenderId) return;

    imageUrl.value = pngUrl;
    error.value = "";
  } catch (err) {
    if (currentRenderId !== lastRenderId) return;
    console.error("Mermaid Render Error:", err);
    const message = err instanceof Error ? err.message : "Invalid Mermaid syntax";
    error.value = message;
    imageUrl.value = "";
  } finally {
    if (currentRenderId === lastRenderId) {
      isRendering.value = false;
    }
  }
};

watch(
  code,
  (newCode, oldCode) => {
    if (oldCode === undefined) {
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
  <div class="mermaid-editor">
    <h2>Mermaid Editor</h2>
    <div class="row">
      <div class="col-sm-12">
        <textarea
          v-model="code"
          class="form-control font-monospace mb-3 mermaid-textarea"
          placeholder="graph TD; A-->B;"
        />
      </div>
    </div>

    <div class="row mb-2">
      <div class="col-sm-6 text-start">
        <h5>Preview (PNG Image)</h5>
      </div>
      <div class="col-sm-6 text-end">
        <a
          :href="imageUrl || '#'"
          class="btn btn-primary btn-sm"
          :class="{ disabled: !imageUrl || error }"
          download="mermaid-diagram.png"
        >
          Download PNG
        </a>
      </div>
    </div>

    <div class="row">
      <div class="col-sm-12">
        <div class="preview-container">
          <div v-if="!code" class="text-muted p-4">Please enter Mermaid code</div>

          <div v-else-if="isRendering" class="text-muted p-4">
            <output class="spinner-border text-primary spinner-border-sm me-2">
              <span class="visually-hidden">Loading...</span>
            </output>
            Rendering...
          </div>

          <div v-else-if="error" class="alert alert-danger m-3 text-start w-100">
            <strong>Error:</strong> <span>{{ error }}</span>
          </div>

          <img
            v-else-if="imageUrl"
            :src="imageUrl"
            class="img-fluid"
            alt="Rendered Diagram"
            title="Right click to save"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mermaid-textarea {
  min-height: 200px;
}

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
