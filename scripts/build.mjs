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

		build.onResolve({ filter: /^(node:)?(crypto|vm|zlib)$/ }, () => ({
			path: emptyModulePath,
		}));

		build.onResolve(
			{
				filter:
					/^(node:)?(fs|path|stream|util|module|url|events|os|http|https|assert|console|constants|readline|timers|tty|string_decoder)\/?$/,
			},
			(args) => {
				const name = args.path.replace(/^node:/, "").replace(/\/$/, "");
				const resolved = require.resolve(`@jspm/core/nodelibs/${name}`);
				return { path: resolved };
			},
		);
	},
};

const build = async () => {
	process.env.NODE_ENV = "production";

	await fs.rm(distDir, { recursive: true, force: true });
	await fs.mkdir(distDir, { recursive: true });

	await generatePrismAssets();
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

	let result;
	try {
		const vuePluginFactory = await resolveVuePlugin();
		result = await Bun.build({
			entrypoints: [path.resolve(projectRoot, "index.html")],
			outdir: distDir,
			target: "browser",
			splitting: false,
			minify: true,
			sourcemap: "none",
			publicPath: "/",
			naming: "assets/[name]-[hash].[ext]",
			assetNaming: "assets/[name]-[hash].[ext]",
			plugins: [vuePluginFactory(), nodePolyfillPlugin],
		});
	} finally {
		for (const tempAsset of tempAssets) {
			await fs.rm(tempAsset, { force: true });
		}
	}

	if (!result.success) {
		for (const message of result.logs) {
			console.error(message);
		}
		process.exit(1);
	}

	if (await fs.stat(publicDir).catch(() => null)) {
		await fs.cp(publicDir, distDir, { recursive: true });
	}
	await fs.writeFile(
		path.resolve(distDir, "manifest.webmanifest"),
		JSON.stringify(manifest, null, 2),
	);

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

await build();
