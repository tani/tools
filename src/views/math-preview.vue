<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { tex2svgHtml } from "mathxyjax3";
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";
import DownloadLink from "../components/DownloadLink.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";

const input = ref(`\\xymatrix{
  A \\ar[r]^f \\ar[d]_g & B \\ar[d]^h \\\\
  C \\ar[r]_k & D
}`);
const output = ref("");
const imageUrl = ref("");
const error = ref("");
const isRendering = ref(false);

async function convertSvgToPng(svgString: string, scale = 2) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = doc.querySelector("svg");
  if (!svgElement) return "";

  const widthAttr = svgElement.getAttribute("width");
  const heightAttr = svgElement.getAttribute("height");

  let width = 0;
  let height = 0;

  if (widthAttr && heightAttr) {
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.visibility = "hidden";
    container.innerHTML = svgString;
    document.body.appendChild(container);
    const rect = container.querySelector("svg")!.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    document.body.removeChild(container);
  }

  if (!width || !height) {
    width = 800;
    height = 600;
  }

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

const renderMath = async () => {
  if (!input.value.trim()) {
    output.value = "";
    imageUrl.value = "";
    error.value = "";
    isRendering.value = false;
    return;
  }

  isRendering.value = true;
  try {
    const result = tex2svgHtml(input.value, {
      display: true,
      em: 16,
      ex: 8,
    });
    output.value = result;
    error.value = "";

    const parser = new DOMParser();
    const doc = parser.parseFromString(result, "text/html");
    const svg = doc.querySelector("svg");
    if (svg) {
      imageUrl.value = await convertSvgToPng(svg.outerHTML);
    }
  } catch (err) {
    console.error("MathJax Render Error:", err);
    error.value = err instanceof Error ? err.message : "Invalid TeX syntax";
    imageUrl.value = "";
  } finally {
    isRendering.value = false;
  }
};

watch(input, () => {
  renderMath();
}, { immediate: true });

onMounted(() => {
  renderMath();
});
</script>

<template>
  <div>
    <ToolHeader
      title="Math Preview"
      description="Preview TeX, LaTeX, or Xy-pic code as a rendered mathematical expression and export it as a PNG."
    />

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="TeX Input" class="h-100" no-padding>
          <MonospaceEditor
            v-model="input"
            :rows="15"
            placeholder="Enter TeX/LaTeX or Xy-pic code here..."
            class="math-textarea"
          />
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Preview" class="h-100" no-padding>
          <template #header-actions>
            <DownloadLink :href="imageUrl" filename="math-expression.png" label="Download PNG" />
          </template>
          <div class="bg-light">
            <div v-if="error" class="alert alert-danger m-3 small">
              <strong>Error:</strong> {{ error }}
            </div>
            <div
              class="preview-container border-0 rounded-0 p-4 text-center d-flex align-items-center justify-content-center"
              style="min-height: 382px;"
            >
              <div v-if="!input.trim()" class="text-muted small">
                Enter some TeX to see the preview
              </div>
              <LoadingOverlay v-else-if="isRendering" :loading="true" message="Rendering..." />
              <img v-else-if="imageUrl" :src="imageUrl" class="img-fluid" alt="Math Preview" />
            </div>
          </div>
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.math-textarea {
  min-height: 150px;
}
.preview-container {
  min-height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
}
:deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
