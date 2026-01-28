import * as Comlink from "comlink";
import { PDFDocument, type PDFImage, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PDFThumbnail {
	index: number;
	width: number;
	height: number;
	pixels: Uint8ClampedArray;
}

export interface PDFFont {
	name: string;
	type: string;
	embedded: boolean;
	isBold: boolean;
	isItalic: boolean;
	isSerif: boolean;
	isMono: boolean;
	count: number;
	pages: number[];
}

export const pdfWorker = {
	async rasterizePdf(pdfData: Uint8Array): Promise<Uint8Array> {
		const loadingTask = pdfjsLib.getDocument({
			data: pdfData,
			cMapUrl: "https://unpkg.com/pdfjs-dist@5.4.530/cmaps/",
			cMapPacked: true,
		});
		const doc = await loadingTask.promise;

		if (doc.numPages === 0) throw new Error("PDF has no pages");

		const page = await doc.getPage(1);
		const viewport = page.getViewport({ scale: 1.0 });

		const canvas = new OffscreenCanvas(viewport.width, viewport.height);
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Failed to create OffscreenCanvas context");

		await page.render({
			canvasContext: context as unknown as CanvasRenderingContext2D,
			viewport,
			canvas: undefined as unknown as HTMLCanvasElement,
		}).promise;

		const blob = await canvas.convertToBlob({ type: "image/png" });
		return new Uint8Array(await blob.arrayBuffer());
	},

	async getPageCount(pdfData: Uint8Array): Promise<number> {
		const loadingTask = pdfjsLib.getDocument({
			data: pdfData,
			cMapUrl: "https://unpkg.com/pdfjs-dist@5.4.530/cmaps/",
			cMapPacked: true,
		});
		const doc = await loadingTask.promise;
		return doc.numPages;
	},

	async renderThumbnails(
		pdfData: Uint8Array,
		scale: number = 0.5,
	): Promise<PDFThumbnail[]> {
		const loadingTask = pdfjsLib.getDocument({
			data: pdfData,
			cMapUrl: "https://unpkg.com/pdfjs-dist@5.4.530/cmaps/",
			cMapPacked: true,
		});
		const doc = await loadingTask.promise;
		const thumbnails: PDFThumbnail[] = [];

		for (let i = 1; i <= doc.numPages; i++) {
			const page = await doc.getPage(i);
			const viewport = page.getViewport({ scale });

			const canvas = new OffscreenCanvas(viewport.width, viewport.height);
			const context = canvas.getContext("2d");
			if (!context) continue;

			await page.render({
				canvasContext: context as unknown as CanvasRenderingContext2D,
				viewport,
				canvas: undefined as unknown as HTMLCanvasElement,
			}).promise;

			const imageData = context.getImageData(
				0,
				0,
				viewport.width,
				viewport.height,
			);
			thumbnails.push({
				index: i - 1, // 0-based index
				width: viewport.width,
				height: viewport.height,
				pixels: imageData.data,
			});
		}

		return thumbnails;
	},

	async getPageAsImage(
		pdfData: Uint8Array,
		pageIndex: number,
	): Promise<{ width: number; height: number; pixels: Uint8ClampedArray }> {
		const loadingTask = pdfjsLib.getDocument({
			data: pdfData,
			cMapUrl: "https://unpkg.com/pdfjs-dist@5.4.530/cmaps/",
			cMapPacked: true,
		});
		const doc = await loadingTask.promise;

		// pdfjs uses 1-based index
		const page = await doc.getPage(pageIndex + 1);
		const viewport = page.getViewport({ scale: 1.0 });

		const canvas = new OffscreenCanvas(viewport.width, viewport.height);
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Failed to create OffscreenCanvas context");

		await page.render({
			canvasContext: context as unknown as CanvasRenderingContext2D,
			viewport,
			canvas: undefined as unknown as HTMLCanvasElement,
		}).promise;

		const imageData = context.getImageData(
			0,
			0,
			viewport.width,
			viewport.height,
		);

		return {
			width: viewport.width,
			height: viewport.height,
			pixels: imageData.data,
		};
	},

	async extractText(pdfData: Uint8Array): Promise<string> {
		const loadingTask = pdfjsLib.getDocument({
			data: pdfData,
			cMapUrl: "https://unpkg.com/pdfjs-dist@5.4.530/cmaps/",
			cMapPacked: true,
		});
		const doc = await loadingTask.promise;
		let combinedText = "";

		for (let i = 1; i <= doc.numPages; i++) {
			const page = await doc.getPage(i);
			const textContent = await page.getTextContent();

			let pageText = "";
			// Basic text extraction joining items with space
			// pdfjs returns items with transform info, we just want strings
			for (const item of textContent.items) {
				if ("str" in item) {
					pageText += `${item.str} `;
				}
			}

			combinedText += `--- Page ${i} --\n${pageText}\n\n`;
		}

		return combinedText;
	},

	async imageToPdf(
		imageData: Uint8Array,
		mimeType: string,
	): Promise<Uint8Array> {
		const pdfDoc = await PDFDocument.create();

		let image: PDFImage;
		if (mimeType === "image/png") {
			image = await pdfDoc.embedPng(imageData);
		} else if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
			image = await pdfDoc.embedJpg(imageData);
		} else {
			// Try to detect or assume
			// For minimal support, fallback to png if unknown or try catching error
			try {
				image = await pdfDoc.embedPng(imageData);
			} catch {
				image = await pdfDoc.embedJpg(imageData);
			}
		}

		const page = pdfDoc.addPage([image.width, image.height]);
		page.drawImage(image, {
			x: 0,
			y: 0,
			width: image.width,
			height: image.height,
		});

		return await pdfDoc.save();
	},

	async mergePdfs(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
		const mergedPdf = await PDFDocument.create();

		for (const pdfBuffer of pdfBuffers) {
			const pdf = await PDFDocument.load(pdfBuffer);
			const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
			for (const page of copiedPages) {
				mergedPdf.addPage(page);
			}
		}

		return await mergedPdf.save();
	},

	async extractPages(
		pdfData: Uint8Array,
		pageIndices: number[],
	): Promise<Uint8Array> {
		const srcPdf = await PDFDocument.load(pdfData);
		const newPdf = await PDFDocument.create();

		const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
		for (const page of copiedPages) {
			newPdf.addPage(page);
		}

		return await newPdf.save();
	},

	async resizePdf(
		pdfData: Uint8Array,
		width: number,
		height: number,
	): Promise<Uint8Array> {
		const pdfDoc = await PDFDocument.load(pdfData);
		const pages = pdfDoc.getPages();

		for (const page of pages) {
			const { width: oldWidth, height: oldHeight } = page.getSize();

			// Simple scaling to fit new dimensions? Or just resize media box?
			// The original implementation used a transform matrix to scale content.
			// FPDFPage_TransFormWithClip + SetMediaBox.

			// In pdf-lib, we can scale the content and set the page size.
			const scaleX = width / oldWidth;
			const scaleY = height / oldHeight;

			page.scale(scaleX, scaleY);
			page.setSize(width, height);
		}

		return await pdfDoc.save();
	},

	async getFonts(pdfData: Uint8Array): Promise<PDFFont[]> {
		const loadingTask = pdfjsLib.getDocument({
			data: pdfData,
			cMapUrl: "https://unpkg.com/pdfjs-dist@5.4.530/cmaps/",
			cMapPacked: true,
		});
		const doc = await loadingTask.promise;
		const fontsMap = new Map<string, PDFFont>();

		for (let i = 1; i <= doc.numPages; i++) {
			const page = await doc.getPage(i);

			// Access commonObjs (internal API but commonly used)
			// or we can loop through operations in getOperatorList
			// But that's heavy.
			// Let's see if we can get fonts via commonObjs
			const commonObjs = page.commonObjs;

			// We need to trigger parsing. getTextContent triggers it usually.
			await page.getTextContent();

			// commonObjs has a map of objects. We need to iterate it.
			// The internal structure is not officially documented but stable enough?
			// commonObjs.objs is where objects are stored.

			// Alternative: Use doc.getStats() in newer pdf.js? No.

			// Let's iterate over commonObjs if accessible.
			// Note: pdfjs-dist 3/4/5 changed how commonObjs works. It might be async or require `ensureObj`.

			// A reliable way is to inspect `page.getOperatorList()`.
			const opList = await page.getOperatorList();
			const fontDependencies = opList.argsArray;
			const fnArray = opList.fnArray;

			// ops.setFont is usually where font is set.
			// But we need the Font object details.

			// Actually, let's try to access `commonObjs`.
			// In pdf.js v3+, commonObjs is a Proxy or similar.
			// But we can use `page.objs.get(name)`.

			// The safest public API way: there isn't really one for "list all fonts with details".
			// We have to inspect the internal font objects loaded by the page.

			// For now, I'll attempt a best effort extraction.
			// If we can't reliably get it, we might return basic info.

			// But wait, `commonObjs` is populated after `getOperatorList`.
			// `commonObjs.get(key)` returns the object.

			// Let's look at `opList` to find `setFont` calls.
			const ops = pdfjsLib.OPS;

			for (let j = 0; j < fnArray.length; j++) {
				if (fnArray[j] === ops.setFont) {
					const fontName = fontDependencies[j][0];
					// Get the font object
					if (page.commonObjs.has(fontName)) {
						const fontObj = await page.commonObjs.get(fontName);

						if (fontObj) {
							const name = fontObj.name || fontObj.loadedName || "Unknown";
							const existing = fontsMap.get(name);
							if (existing) {
								if (!existing.pages.includes(i)) {
									existing.pages.push(i);
									existing.count++; // Rough count of occurrences (pages)
								}
							} else {
								const lowerName = name.toLowerCase();
								fontsMap.set(name, {
									name,
									type: fontObj.type || "Unknown",
									embedded: fontObj.composite || false, // approximation
									isBold: lowerName.includes("bold"),
									isItalic:
										lowerName.includes("italic") ||
										lowerName.includes("oblique"),
									isSerif:
										lowerName.includes("serif") || lowerName.includes("times"),
									isMono:
										lowerName.includes("mono") || lowerName.includes("courier"),
									count: 1,
									pages: [i],
								});
							}
						}
					}
				}
			}
		}

		return Array.from(fontsMap.values());
	},
};

export type PdfWorker = typeof pdfWorker;

Comlink.expose(pdfWorker);
