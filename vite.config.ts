import vue from "@vitejs/plugin-vue";
import { defineConfig, lazyPlugins } from "vite-plus";
import polyfillPlugin from "./unplugin/polyfill";
import pwaPlugin from "./unplugin/pwa";
import tesseractPlugin from "./unplugin/tesseract";

export default defineConfig({
	plugins: lazyPlugins(() => {
		if (process.env.VITEST) return [vue()];

		return [
			vue(),
			tesseractPlugin.vite(),
			polyfillPlugin.vite(),
			pwaPlugin.vite({
				manifest: {
					name: "Taniguchi's Tools",
					short_name: "TTools",
					description: "A comprehensive suite of developer and utility tools.",
					theme_color: "#ffffff",
					icons: [
						{
							src: "icon-512.png",
							sizes: "512x512",
							type: "image/png",
						},
						{
							src: "icon-512.png",
							sizes: "192x192",
							type: "image/png",
						},
					],
				},
				workbox: {
					maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
					globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm,gz}"],
				},
			}),
		];
	}),
	fmt: {
		ignorePatterns: ["src/generated/prism-assets.ts", "package-lock.json"],
		printWidth: 80,
		sortImports: { newlinesBetween: false, partitionByNewline: true },
		sortPackageJson: false,
	},
	lint: {
		ignorePatterns: ["src/generated/prism-assets.ts"],
		plugins: ["eslint", "typescript", "unicorn", "oxc", "vue"],
		rules: {
			"no-unused-vars": "off",
			"typescript/no-explicit-any": "warn",
		},
	},
	build: {
		emptyOutDir: false,
	},
	worker: {
		format: "es",
	},
});
