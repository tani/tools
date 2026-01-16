import path from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [vue()],
	build: {
		outDir: "dist",
		emptyOutDir: true,
		rollupOptions: {
			output: {
				manualChunks: undefined,
			},
		},
	},
	publicDir: false,
	resolve: {
		alias: {
			buffer: "buffer/",
			process: "process/browser",
			"node:zlib": "browserify-zlib",
			zlib: "browserify-zlib",
			"node:stream": "stream-browserify",
			stream: "stream-browserify",
			"node:util": "util/",
			util: "util/",
		},
	},
	define: {
		"process.env": {},
		global: "globalThis",
	},
	optimizeDeps: {
		esbuildOptions: {
			define: {
				global: "globalThis",
			},
		},
		exclude: ["just-bash"],
	},
});
