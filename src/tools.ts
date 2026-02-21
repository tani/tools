import type { Component } from "vue";

export interface Tool {
	path: string;
	name: string;
	icon: string;
	description: string;
	component: () => Promise<{ default: Component }>;
	category:
		| "Text Tools"
		| "Developer Tools"
		| "Math & LaTeX"
		| "Graphics & Images"
		| "PDF Tools"
		| "Utilities";
}

export const tools: Tool[] = [
	// Text Tools
	{
		path: "/replace",
		name: "Replace",
		icon: "🔁",
		description: "Batch replace text with advanced options.",
		component: () => import("./views/replace.vue"),
		category: "Text Tools",
	},
	{
		path: "/diff",
		name: "Diff",
		icon: "🆚",
		description: "Compare two texts side by side and highlight changes.",
		component: () => import("./views/diff.vue"),
		category: "Text Tools",
	},
	{
		path: "/word-count",
		name: "Word Count",
		icon: "🔢",
		description: "Count words, characters, and reading time.",
		component: () => import("./views/word-count.vue"),
		category: "Text Tools",
	},
	{
		path: "/pattern",
		name: "Pattern Fold",
		icon: "🧩",
		description: "Extract common patterns from multiple lines of text.",
		component: () => import("./views/pattern.vue"),
		category: "Text Tools",
	},
	{
		path: "/encoding",
		name: "Encoding",
		icon: "🔠",
		description: "Convert uploaded text files between character sets.",
		component: () => import("./views/encoding.vue"),
		category: "Text Tools",
	},
	{
		path: "/budoux",
		name: "Japanese Wrap",
		icon: "🇯🇵",
		description: "Smart line-breaking for Japanese text at natural boundaries.",
		component: () => import("./views/budoux.vue"),
		category: "Text Tools",
	},
	// Developer Tools
	{
		path: "/prettier",
		name: "Prettier",
		icon: "💅",
		description: "Format JSON, YAML, and code snippets instantly.",
		component: () => import("./views/prettier.vue"),
		category: "Developer Tools",
	},
	{
		path: "/regex",
		name: "Regex",
		icon: "🔍",
		description: "Search content using powerful regular expressions.",
		component: () => import("./views/regex.vue"),
		category: "Developer Tools",
	},
	{
		path: "/regex-cheat",
		name: "Regex Cheat",
		icon: "📖",
		description: "Quickly reference regex tokens and examples.",
		component: () => import("./views/regex-cheat.vue"),
		category: "Developer Tools",
	},
	{
		path: "/grammar",
		name: "Grammar",
		icon: "🌳",
		description: "Generate context-free grammar from text.",
		component: () => import("./views/grammar.vue"),
		category: "Developer Tools",
	},
	{
		path: "/highlight",
		name: "Highlight",
		icon: "🖍️",
		description: "Highlight syntax for dozens of programming languages.",
		component: () => import("./views/highlight.vue"),
		category: "Developer Tools",
	},
	{
		path: "/awk",
		name: "AWK Playground",
		icon: "🐧",
		description: "Run AWK scripts in your browser with real-time preview.",
		component: () => import("./views/awk.vue"),
		category: "Developer Tools",
	},
	{
		path: "/sed",
		name: "SED Playground",
		icon: "📝",
		description: "Run SED scripts in your browser with real-time preview.",
		component: () => import("./views/sed.vue"),
		category: "Developer Tools",
	},
	{
		path: "/jq",
		name: "JQ Playground",
		icon: "🔍",
		description: "Run JQ filters against JSON data in your browser.",
		component: () => import("./views/jq.vue"),
		category: "Developer Tools",
	},
	// Math & LaTeX
	{
		path: "/unicode-latex",
		name: "Unicode → LaTeX",
		icon: "🔣",
		description: "Convert Unicode math symbols to LaTeX markup.",
		component: () => import("./views/unicode-latex.vue"),
		category: "Math & LaTeX",
	},
	{
		path: "/latex-unicode",
		name: "LaTeX → Unicode",
		icon: "🧮",
		description: "Turn LaTeX expressions into readable Unicode.",
		component: () => import("./views/latex-unicode.vue"),
		category: "Math & LaTeX",
	},
	{
		path: "/math-preview",
		name: "Math Preview",
		icon: "♾️",
		description: "Preview rendered math expressions in real time.",
		component: () => import("./views/math-preview.vue"),
		category: "Math & LaTeX",
	},
	{
		path: "/statistics",
		name: "Statistics",
		icon: "📊",
		description: "Calculate descriptive statistics from your dataset.",
		component: () => import("./views/statistics.vue"),
		category: "Math & LaTeX",
	},
	// Graphics & Images
	{
		path: "/image-resize",
		name: "Image Resize",
		icon: "🖼️",
		description: "Resize images while keeping quality in check.",
		component: () => import("./views/image-resize.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/image-convert",
		name: "Image Convert",
		icon: "🔃",
		description: "Convert between PNG, JPEG, WebP, AVIF, HEIC, and more.",
		component: () => import("./views/image-convert.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/video-clipper",
		name: "Video Clipper",
		icon: "🎬",
		description: "Trim and shorten video files directly in the browser.",
		component: () => import("./views/video-clipper.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/gif-converter",
		name: "GIF Converter",
		icon: "🎞️",
		description:
			"Convert video files to animated GIFs directly in the browser.",
		component: () => import("./views/gif-converter.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/ocr",
		name: "OCR",
		icon: "👁️",
		description: "Extract text from images using OCR.",
		component: () => import("./views/ocr.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/svg-png",
		name: "SVG → PNG",
		icon: "🖼️",
		description: "Export SVG artwork to high-quality PNG files.",
		component: () => import("./views/svg-png.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/mermaid",
		name: "Mermaid",
		icon: "🧜‍♀️",
		description: "Generate diagrams from Mermaid markdown.",
		component: () => import("./views/mermaid.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/graphviz",
		name: "Graphviz",
		icon: "🕸️",
		description: "Generate diagrams from Graphviz DOT syntax.",
		component: () => import("./views/graphviz.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/bg-remover",
		name: "BG Remover",
		icon: "✨",
		description: "Remove backgrounds from images automatically.",
		component: () => import("./views/bg-remover.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/image-upscale",
		name: "Image Upscale",
		icon: "🔍",
		description: "Upscale images using AI directly in the browser.",
		component: () => import("./views/image-upscale.vue"),
		category: "Graphics & Images",
	},
	// PDF Tools
	{
		path: "/pdf-viewer",
		name: "PDF Viewer",
		icon: "📄",
		description: "View PDF documents directly in the browser.",
		component: () => import("./views/pdf-viewer.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-merge",
		name: "PDF Merge",
		icon: "📄",
		description: "Combine multiple PDFs into a single file.",
		component: () => import("./views/pdf-merge.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-extract",
		name: "PDF Extract",
		icon: "📄",
		description: "Extract specific pages from a PDF.",
		component: () => import("./views/pdf-extract.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-resize",
		name: "PDF Resize",
		icon: "📄",
		description: "Adjust page sizes and margins for PDFs.",
		component: () => import("./views/pdf-resize.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-sort",
		name: "PDF Sort",
		icon: "📄",
		description: "Reorder PDF pages with drag-and-drop ease.",
		component: () => import("./views/pdf-sort.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-text",
		name: "PDF → Text",
		icon: "📄",
		description: "Convert PDF content into editable text.",
		component: () => import("./views/pdf-text.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-fonts",
		name: "PDF Fonts",
		icon: "📄",
		description: "Inspect and list fonts embedded in PDFs.",
		component: () => import("./views/pdf-fonts.vue"),
		category: "PDF Tools",
	},
	// Utilities
	{
		path: "/pomodoro",
		name: "Pomodoro",
		icon: "🍅",
		description: "Track focus sessions with the Pomodoro timer.",
		component: () => import("./views/pomodoro.vue"),
		category: "Utilities",
	},
];
