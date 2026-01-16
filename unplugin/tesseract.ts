import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createUnplugin } from "unplugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function downloadFile(url: string, dest: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (fs.existsSync(dest)) {
			resolve();
			return;
		}
		const file = fs.createWriteStream(dest);
		https
			.get(url, (response) => {
				if (response.statusCode !== 200) {
					reject(new Error(`Failed to download: ${response.statusCode}`));
					return;
				}
				response.pipe(file);
				file.on("finish", () => {
					file.close();
					resolve();
				});
			})
			.on("error", (err) => {
				if (fs.existsSync(dest)) {
					fs.unlink(dest, () => {});
				}
				reject(err);
			});
	});
}

export default createUnplugin(() => {
	return {
		name: "tesseract-copy",
		async buildStart() {
			const publicDir = path.resolve(projectRoot, "public/tesseract");
			const langDir = path.resolve(publicDir, "lang");

			if (!fs.existsSync(publicDir)) {
				fs.mkdirSync(publicDir, { recursive: true });
			}
			if (!fs.existsSync(langDir)) {
				fs.mkdirSync(langDir, { recursive: true });
			}

			// Copy worker
			const workerPath = path.resolve(
				projectRoot,
				"node_modules/tesseract.js/dist/worker.min.js",
			);
			if (fs.existsSync(workerPath)) {
				fs.copyFileSync(workerPath, path.resolve(publicDir, "worker.min.js"));
			}

			// Copy core
			const coreDir = path.resolve(
				projectRoot,
				"node_modules/tesseract.js-core",
			);
			if (fs.existsSync(coreDir)) {
				const files = fs.readdirSync(coreDir);
				for (const file of files) {
					if (
						file.startsWith("tesseract-core") &&
						(file.endsWith(".js") || file.endsWith(".wasm"))
					) {
						fs.copyFileSync(
							path.resolve(coreDir, file),
							path.resolve(publicDir, file),
						);
					}
				}
			}

			// Download languages
			const ocrPath = path.resolve(projectRoot, "src/views/ocr.vue");
			let languages = ["eng", "jpn"];
			if (fs.existsSync(ocrPath)) {
				const content = fs.readFileSync(ocrPath, "utf-8");
				const matches = [...content.matchAll(/code: "([a-z_]+)"/g)];
				if (matches.length > 0) {
					languages = matches.map((m) => m[1]);
				}
			}

			const baseUrl = "https://tessdata.projectnaptha.com/4.0.0/";
			await Promise.all(
				languages.map((lang) =>
					downloadFile(
						`${baseUrl}${lang}.traineddata.gz`,
						path.resolve(langDir, `${lang}.traineddata.gz`),
					),
				),
			);
		},
	};
});
