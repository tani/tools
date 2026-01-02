<template>
  <div class="container py-4">
    <h2 class="display-6 mb-2">Code Highlighter</h2>
    <p class="text-muted mb-4">
      Generate beautiful syntax-highlighted code snippets using Shiki and download them as PNG
      images.
    </p>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label for="language" class="form-label small text-muted">Language</label>
            <select id="language" v-model="language" class="form-select">
              <option v-for="lang in languages" :key="lang.value" :value="lang.value">
                {{ lang.label }}
              </option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="theme" class="form-label small text-muted">Theme</label>
            <select id="theme" v-model="theme" class="form-select">
              <option
                v-for="themeOption in themes"
                :key="themeOption.value"
                :value="themeOption.value"
              >
                {{ themeOption.label }}
              </option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="fontSize" class="form-label small text-muted">Font Size</label>
            <div class="input-group">
              <input
                id="fontSize"
                v-model.number="fontSize"
                type="number"
                class="form-control"
                min="10"
                max="32"
                step="1"
              />
              <span class="input-group-text">px</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-6">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-semibold">Code</span>
            <span class="text-muted small">Auto-renders with Shiki</span>
          </div>
          <div class="card-body">
            <textarea
              v-model="code"
              class="form-control font-monospace"
              rows="14"
              spellcheck="false"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-semibold">Preview</span>
            <button
              class="btn btn-link p-0 small"
              :disabled="isRendering || isDownloading"
              @click="downloadPng"
            >
              {{ isDownloading ? "Preparing..." : "Download PNG" }}
            </button>
          </div>
          <div class="card-body bg-light">
            <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
            <div v-else class="code-wrapper font-monospace preview-surface" :style="wrapperStyle">
              <LoadingOverlay v-if="isRendering" :loading="true" message="Rendering..." />
              <img
                v-else-if="previewImage"
                :src="previewImage"
                class="img-fluid rounded"
                alt="Highlighted code preview"
              />
              <div v-else class="text-muted small">Preview will appear here.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="render-target" aria-hidden="true">
      <div
        class="code-wrapper font-monospace"
        :style="wrapperStyle"
        ref="renderRef"
        v-html="highlightedHtml"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { toPng } from "html-to-image";
import LoadingOverlay from "../components/LoadingOverlay.vue";
import {
  BundledLanguage,
  BundledTheme,
  bundledLanguages,
  bundledLanguagesInfo,
  bundledThemes,
  bundledThemesInfo,
  codeToHtml,
} from "shiki";

type LanguageOption = {
  value: BundledLanguage;
  label: string;
};

type ThemeOption = {
  value: BundledTheme;
  label: string;
};

const languages = computed<LanguageOption[]>(() =>
  bundledLanguagesInfo
    .map((lang) => ({ value: lang.id as BundledLanguage, label: lang.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
);

const themes = computed<ThemeOption[]>(() =>
  bundledThemesInfo
    .map((themeInfo) => ({ value: themeInfo.id as BundledTheme, label: themeInfo.displayName }))
    .sort((a, b) => a.label.localeCompare(b.label))
);

const code = ref(`function greet(name: string) {
  return ` + "`Hello, ${name}!`" + `;
}

greet("Taniguchi");`);
const language = ref<BundledLanguage>("typescript");
const theme = ref<BundledTheme>("github-light");
const fontSize = ref(14);
const highlightedHtml = ref("");
const isRendering = ref(false);
const isDownloading = ref(false);
const error = ref("");
const renderRef = ref<HTMLElement | null>(null);
const previewImage = ref("");
let renderTimeout: number | undefined;

const wrapperStyle = computed(() => ({
  fontSize: `${fontSize.value}px`,
}));

const generatePng = async () => {
  if (!renderRef.value) {
    throw new Error("Preview target is unavailable.");
  }

  return toPng(renderRef.value, {
    pixelRatio: 2,
    cacheBust: true,
    skipFonts: true,
  });
};

const renderHighlight = async () => {
  error.value = "";
  isRendering.value = true;
  try {
    highlightedHtml.value = await codeToHtml(code.value, {
      lang: language.value,
      theme: theme.value,
    });

    await nextTick();
    previewImage.value = await generatePng();
  } catch (renderError) {
    error.value = renderError instanceof Error ? renderError.message : "Failed to render code.";
    previewImage.value = "";
  } finally {
    isRendering.value = false;
  }
};

const scheduleRender = () => {
  if (renderTimeout) {
    window.clearTimeout(renderTimeout);
  }

  renderTimeout = window.setTimeout(renderHighlight, 200);
};

watch([code, language, theme, fontSize], scheduleRender, { immediate: true });

onMounted(() => {
  renderHighlight();
});

const downloadPng = async () => {
  isDownloading.value = true;
  error.value = "";
  try {
    const dataUrl = previewImage.value || (await generatePng());
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `code-highlight-${language.value}.png`;
    link.click();
  } catch (downloadError) {
    error.value =
      downloadError instanceof Error ? downloadError.message : "Unable to generate PNG from the preview.";
  } finally {
    isDownloading.value = false;
  }
};
</script>

<style scoped>
.render-target {
  position: absolute;
  top: -9999px;
  left: -9999px;
  pointer-events: none;
}

.code-wrapper {
  min-height: 320px;
  padding: 1rem;
}

.preview-surface {
  display: flex;
  align-items: center;
  justify-content: center;
}

.code-wrapper pre {
  margin: 0;
  border-radius: 0.5rem;
  overflow: auto;
}
</style>
