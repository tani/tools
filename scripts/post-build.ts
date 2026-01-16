import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSW } from "workbox-build";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.resolve(projectRoot, "dist");
const publicDir = path.resolve(projectRoot, "public");

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

const postBuild = async () => {
	console.log("Copying public assets...");
	if (await fs.stat(publicDir).catch(() => null)) {
		await fs.cp(publicDir, distDir, { recursive: true });
	}

	await fs.writeFile(
		path.resolve(distDir, "manifest.webmanifest"),
		JSON.stringify(manifest, null, 2),
	);

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

	console.log("Post-build complete!");
};

await postBuild();
