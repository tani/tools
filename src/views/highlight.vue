<template>
  <div class="container py-4">
    <ToolHeader
      title="Highlight"
      description="Generate syntax-highlighted code snippets using Prism.js and download them as PNG images."
    />

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label for="language" class="form-label small text-muted">Language</label>
            <select id="language" v-model="state.language" class="form-select">
              <option v-for="lang in LANGUAGES" :key="lang.id" :value="lang.id">
                {{ lang.id }}
              </option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="theme" class="form-label small text-muted">Theme</label>
            <select id="theme" v-model="state.themeId" class="form-select">
              <option v-for="t in THEMES" :key="t.id" :value="t.id">
                {{ t.id }}
              </option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="fontSize" class="form-label small text-muted">Font Size</label>
            <div class="input-group">
              <input
                id="fontSize"
                v-model.number="state.fontSize"
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
        <ToolCard title="Code" class="h-100" no-padding>
          <template #header-actions>
            <span class="text-muted small">Auto-renders with Prism</span>
          </template>
          <MonospaceEditor
            v-model="state.code"
            :language="state.language"
            :rows="14"
            placeholder="Paste your code here..."
          />
        </ToolCard>
      </div>

      <div class="col-lg-6">
        <ToolCard title="Preview" class="h-100" no-padding>
          <template #header-actions>
            <button
              class="btn btn-link p-0 small"
              :disabled="status.isRendering || status.isDownloading"
              @click="downloadPng"
            >
              {{ status.isDownloading ? "Preparing..." : "Download PNG" }}
            </button>
          </template>
          <div class="card-body bg-light h-100">
            <div v-if="status.error" class="alert alert-danger" role="alert">{{ status.error }}</div>
            <div v-else class="code-wrapper font-monospace preview-surface" :style="{ fontSize: `${state.fontSize}px` }">
              <LoadingOverlay v-if="status.isRendering" :loading="true" message="Rendering..." />
              <img
                v-else-if="state.previewImage"
                :src="state.previewImage"
                class="img-fluid rounded shadow-sm"
                alt="Highlighted code preview"
              />
              <div v-else class="text-muted small">Preview will appear here.</div>
            </div>
          </div>
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Prism from "prismjs";
import { reactive, watch } from "vue";
import "prismjs/components/prism-markup-templating"; // Core dependency for templating languages
import LoadingOverlay from "../components/LoadingOverlay.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import { PRISM_LANGUAGES, PRISM_THEMES } from "../generated/prism-assets";

// --- Constants ---

const FONT_STACK =
	'SF Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const PADDING = 20;

// --- Types ---

interface SimpleToken {
	content: string;
	color: string;
}

interface ParsedTheme {
	bg: string;
	fg: string;
	colors: Record<string, string>;
}

interface AppState {
	code: string;
	language: string;
	themeId: string;
	fontSize: number;
	previewImage: string;
}

interface AppStatus {
	isRendering: boolean;
	isDownloading: boolean;
	error: string;
}

// --- Data & Resources ---

const LANGUAGES = PRISM_LANGUAGES;
const THEMES = PRISM_THEMES;

// --- State ---

const state = reactive<AppState>({
	code: `function greet(name: string) {
  return \`Hello, \${name}!\`;
}

greet("Taniguchi");`,
	language: "typescript",
	themeId: "default",
	fontSize: 14,
	previewImage: "",
});

const status = reactive<AppStatus>({
	isRendering: false,
	isDownloading: false,
	error: "",
});

const loadedLanguages = new Set<string>();
const themeCache = new Map<string, ParsedTheme>();

// --- Utilities: Theme Parsing ---

const extractColor = (
	declarations: string,
	property: string,
): string | null => {
	const regex = new RegExp(`${property}\\s*:\\s*([^;]+)(?:;|$)`, "i");
	const match = declarations.match(regex);
	return match ? match[1].trim() : null;
};

const parseThemeCss = (css: string): ParsedTheme => {
	const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, ""); // Remove comments
	const blockRegex = /([^{]+)\{([^}]+)\}/g;

	const theme: ParsedTheme = { bg: "#ffffff", fg: "#000000", colors: {} };
	let match: RegExpExecArray | null = blockRegex.exec(cleanCss);
	while (match !== null) {
		const selectors = match[1].split(",").map((s) => s.trim());
		const decls = match[2];

		for (const selector of selectors) {
			if (
				selector.includes('code[class*="language-"]') ||
				selector.includes('pre[class*="language-"]')
			) {
				theme.bg =
					extractColor(decls, "background-color") ||
					extractColor(decls, "background") ||
					theme.bg;
				theme.fg = extractColor(decls, "color") || theme.fg;
			}

			const tokenMatch = selector.match(/\.token\.([a-z0-9-]+)/i);
			if (tokenMatch) {
				const color = extractColor(decls, "color");
				if (color) theme.colors[tokenMatch[1]] = color;
			}
		}
		match = blockRegex.exec(cleanCss);
	}
	return theme;
};

// --- Utilities: Token Processing ---

const flattenTokens = (
	tokens: (string | Prism.Token)[],
	colors: Record<string, string>,
	defaultColor: string,
): SimpleToken[] => {
	const result: SimpleToken[] = [];

	const visit = (
		token: string | Prism.Token | (string | Prism.Token)[],
		inheritedColor: string,
	) => {
		if (typeof token === "string") {
			result.push({ content: token, color: inheritedColor });
		} else if (Array.isArray(token)) {
			token.forEach((t) => {
				visit(t, inheritedColor);
			});
		} else {
			visit(token.content, colors[token.type] || inheritedColor);
		}
	};

	tokens.forEach((t) => {
		visit(t, defaultColor);
	});
	return result;
};

// --- Utilities: Canvas Rendering ---

const createHighResCanvas = (width: number, height: number, pixelRatio = 2) => {
	const canvas = document.createElement("canvas");
	canvas.width = width * pixelRatio;
	canvas.height = height * pixelRatio;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
	const ctx = canvas.getContext("2d");
	if (ctx) ctx.scale(pixelRatio, pixelRatio);
	return { canvas, ctx };
};

const renderToCanvas = (
	tokens: SimpleToken[],
	theme: ParsedTheme,
	fontSize: number,
): string => {
	const font = `${fontSize}px ${FONT_STACK}`;
	const lineHeight = fontSize * 1.5;

	// 1. Split into lines
	const lines: SimpleToken[][] = [];
	let currentLine: SimpleToken[] = [];

	tokens.forEach((token) => {
		const parts = token.content.split("\n");
		parts.forEach((part, i) => {
			if (part) currentLine.push({ content: part, color: token.color });
			if (i < parts.length - 1) {
				lines.push(currentLine);
				currentLine = [];
			}
		});
	});
	lines.push(currentLine);

	// 2. Measure dimensions
	const measureCanvas = document.createElement("canvas");
	const measureCtx = measureCanvas.getContext("2d");
	if (!measureCtx) return "";
	measureCtx.font = font;

	let maxWidth = 0;
	lines.forEach((line) => {
		const lineWidth = line.reduce(
			(w, t) => w + measureCtx.measureText(t.content).width,
			0,
		);
		maxWidth = Math.max(maxWidth, lineWidth);
	});

	const width = Math.ceil(maxWidth + PADDING * 2);
	const height = Math.ceil(lines.length * lineHeight + PADDING * 2);

	// 3. Draw
	const { canvas, ctx } = createHighResCanvas(width, height);
	if (!ctx) throw new Error("Canvas context extraction failed");

	// Background
	ctx.fillStyle = theme.bg;
	ctx.fillRect(0, 0, width, height);

	// Text
	ctx.font = font;
	ctx.textBaseline = "top";

	let y = PADDING;
	lines.forEach((line) => {
		let x = PADDING;
		line.forEach((token) => {
			ctx.fillStyle = token.color;
			ctx.fillText(token.content, x, y);
			x += ctx.measureText(token.content).width;
		});
		y += lineHeight;
	});

	return canvas.toDataURL("image/png");
};

// --- Actions ---

const ensureLanguageLoaded = async (lang: string) => {
	if (loadedLanguages.has(lang)) return;
	const entry = LANGUAGES.find((l) => l.id === lang);
	if (entry) {
		await entry.module();
		loadedLanguages.add(lang);
	}
};

const ensureThemeParsed = async (themeId: string): Promise<ParsedTheme> => {
	const cached = themeCache.get(themeId);
	if (cached) {
		return cached;
	}
	const entry = THEMES.find((t) => t.id === themeId);
	const css = entry ? entry.css : "";
	const parsed = parseThemeCss(css);
	themeCache.set(themeId, parsed);
	return parsed;
};

const render = async () => {
	status.isRendering = true;
	status.error = "";

	try {
		// 1. Prepare Resources
		await ensureLanguageLoaded(state.language);
		const theme = await ensureThemeParsed(state.themeId);

		// 2. Tokenize
		const grammar = Prism.languages[state.language] || Prism.languages.markup;
		const tokens = Prism.tokenize(state.code, grammar);
		const flatTokens = flattenTokens(tokens, theme.colors, theme.fg);

		// 3. Render
		state.previewImage = renderToCanvas(flatTokens, theme, state.fontSize);
	} catch (e) {
		status.error = (e as Error).message || "Rendering failed";
		console.error(e);
	} finally {
		status.isRendering = false;
	}
};

const downloadPng = () => {
	if (!state.previewImage) return;
	status.isDownloading = true;
	try {
		const link = document.createElement("a");
		link.href = state.previewImage;
		link.download = `highlight-${state.language}.png`;
		link.click();
	} catch (e) {
		status.error = "Download failed";
	} finally {
		status.isDownloading = false;
	}
};

// --- Watchers ---

let debounceTimer: number;
watch(
	() => [state.code, state.language, state.themeId, state.fontSize],
	() => {
		clearTimeout(debounceTimer);
		debounceTimer = window.setTimeout(render, 500);
	},
	{ deep: true, immediate: true },
);
</script>

<style scoped>
.code-wrapper {
  min-height: 320px;
  padding: 1rem;
  overflow: auto;
}

.preview-surface {
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-fluid {
  max-width: 100%;
  height: auto;
}
</style>
