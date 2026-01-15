import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSW } from "workbox-build";
import { generatePrismAssets } from "./generate-prism-assets.mjs";
import { prepareTesseractAssets } from "./prepare-tesseract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const distDir = path.resolve(projectRoot, "dist");
const publicDir = path.resolve(projectRoot, "public");
const emptyModulePath = path.resolve(projectRoot, "scripts/empty.cjs");

const manifest = {
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
};

const rootAssetSources = [
	{
		name: "favicon.ico",
		source: path.resolve(publicDir, "favicon.ico"),
	},
	{
		name: "icon-512.png",
		source: path.resolve(publicDir, "icon-512.png"),
	},
	{
		name: "manifest.webmanifest",
		source: null,
	},
];

const resolveVuePlugin = async () => {
	const mod = await import("@eckidevs/bun-plugin-vue");
	return (
		mod.default ||
		mod.bunPluginVue ||
		mod.vue ||
		mod.pluginVue ||
		(() => {
			throw new Error(
				"Unable to resolve Vue plugin from @eckidevs/bun-plugin-vue",
			);
		})
	);
};

const nodePolyfillPlugin = {
	name: "node-polyfills",
	setup(build) {
		build.onResolve({ filter: /^(node:)?buffer$/ }, () => ({
			path: require.resolve("buffer/"),
		}));

		build.onResolve({ filter: /^(node:)?process$/ }, () => ({
			path: require.resolve("process/browser"),
		}));

		build.onResolve({ filter: /^(node:)?(crypto|vm|zlib|module)$/ }, () => ({
			path: emptyModulePath,
		}));

		build.onResolve(
			{
				filter:
					/^(node:)?(fs|path|stream|util|url|events|os|http|https|assert|console|constants|readline|timers|tty|string_decoder)\/?$/,
			},
			(args) => {
				if (args.importer.includes("@jspm/core")) {
					return;
				}
				const name = args.path.replace(/^node:/, "").replace(/\/$/, "");
				const resolved = require.resolve(`@jspm/core/nodelibs/${name}`);
				return { path: resolved };
			},
		);
	},
};

const cleanDist = async () => {
	console.log("Cleaning dist directory...");
	await fs.rm(distDir, { recursive: true, force: true });
	await fs.mkdir(distDir, { recursive: true });
};

const prepareAssets = async () => {
	console.log("Generating Prism assets...");
	await generatePrismAssets();
	console.log("Preparing Tesseract assets...");
	await prepareTesseractAssets();

	const tempAssets = [];
	for (const asset of rootAssetSources) {
		const targetPath = path.resolve(projectRoot, asset.name);
		const exists = await fs.stat(targetPath).catch(() => null);
		if (exists) continue;
		if (asset.source) {
			await fs.copyFile(asset.source, targetPath);
		} else {
			await fs.writeFile(targetPath, JSON.stringify(manifest, null, 2));
		}
		tempAssets.push(targetPath);
	}
	return tempAssets;
};

const bundle = async () => {
	console.log("Starting Bun.build...");
	const vuePluginFactory = await resolveVuePlugin();
	const workerEntrypoints = [
		path.resolve(projectRoot, "src/workers/pdf-worker.ts"),
		path.resolve(projectRoot, "src/workers/oniguruma-worker.ts"),
		path.resolve(projectRoot, "src/workers/opencv-worker.ts"),
		path.resolve(projectRoot, "src/workers/prettier-worker.ts"),
		path.resolve(projectRoot, "src/workers/tesseract-worker.ts"),
	];

	const result = await Bun.build({
		entrypoints: [
			path.resolve(projectRoot, "index.html"),
			...workerEntrypoints,
		],
		outdir: distDir,
		target: "browser",
		splitting: false,
		minify: true,
		sourcemap: "none",
		publicPath: "/",
		naming: "assets/[name]-[hash].[ext]",
		assetNaming: "assets/[name]-[hash].[ext]",
		plugins: [vuePluginFactory(), nodePolyfillPlugin],
		loader: {
			".wasm": "file",
			".png": "file",
			".jpg": "file",
			".svg": "file",
			".ico": "file",
		},
	});

	if (!result.success) {
		console.error("Build failed!");
		for (const message of result.logs) {
			console.error(message);
		}
		process.exit(1);
	}
	console.log("Bun.build completed successfully.");
	return result;
};

const postProcess = async (result) => {
	// Fix worker URLs in the bundled chunks
	const workerMap = {};
	for (const output of result.outputs) {
		const fileName = path.basename(output.path);
		if (fileName.includes("-worker-") && fileName.endsWith(".js")) {
			// Find the original name by removing hash and extension
			const originalName = fileName.replace(/-[a-z0-9]+\.js$/, ".ts");
			workerMap[originalName] = fileName;
		}
	}

	for (const output of result.outputs) {
		if (
			output.path.endsWith(".js") &&
			!path.basename(output.path).includes("-worker-")
		) {
			let content = await fs.readFile(output.path, "utf-8");
			let changed = false;
			for (const [tsName, jsName] of Object.entries(workerMap)) {
				const regex = new RegExp(`\\.\\.\\/workers\\/${tsName}`, "g");
				if (regex.test(content)) {
					const replacement = output.path.includes("/assets/")
						? `./${jsName}`
						: `./assets/${jsName}`;
					content = content.replace(regex, replacement);
					changed = true;
				}
			}
			if (changed) {
				await fs.writeFile(output.path, content);
			}
		}
	}

	// Move index.html from assets/ to root and fix paths
	const htmlOutput = result.outputs.find((o) => o.path.endsWith(".html"));
	if (htmlOutput) {
		const htmlPath = htmlOutput.path;
		let htmlContent = await fs.readFile(htmlPath, "utf-8");
		htmlContent = htmlContent.replace(/href="\/..\//g, 'href="/');
		htmlContent = htmlContent.replace(/src="\/..\//g, 'src="/');
		await fs.writeFile(path.resolve(distDir, "index.html"), htmlContent);
		console.log("Moved index.html to root and adjusted paths.");
	}

	if (await fs.stat(publicDir).catch(() => null)) {
		await fs.cp(publicDir, distDir, { recursive: true });
	}
	await fs.writeFile(
		path.resolve(distDir, "manifest.webmanifest"),
		JSON.stringify(manifest, null, 2),
	);
};

const genSW = async () => {
	console.log("Generating service worker...");
	await generateSW({
		swDest: path.resolve(distDir, "sw.js"),
		globDirectory: distDir,
		skipWaiting: true,
		clientsClaim: true,
		maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
		globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm,gz}"],
		mode: "development",
		disableDevLogs: true,
	});
};

const build = async () => {
	process.env.NODE_ENV = "production";

	await cleanDist();
	const tempAssets = await prepareAssets();

	try {
		const result = await bundle();
		await postProcess(result);
		await genSW();
		console.log("Build finished successfully!");
	} finally {
		for (const tempAsset of tempAssets) {
			await fs.rm(tempAsset, { force: true });
		}
	}
};

await build();
