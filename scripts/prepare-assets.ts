import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePrismAssets } from "./generate-prism-assets.ts";
import { prepareTesseractAssets } from "./prepare-tesseract.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
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

await prepareAssets();
console.log("Asset preparation complete!");
