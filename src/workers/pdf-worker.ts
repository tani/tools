import { init, type WrappedPdfiumModule } from "@embedpdf/pdfium";
import pdfiumWasm from "@embedpdf/pdfium/pdfium.wasm";
import * as Comlink from "comlink";

let pdfiumModule: WrappedPdfiumModule | null = null;

async function ensurePdfium() {
	if (pdfiumModule) return pdfiumModule;

	pdfiumModule = await init({
		locateFile: (path: string) => {
			if (path.endsWith(".wasm")) {
				return pdfiumWasm;
			}
			return path;
		},
	});
	return pdfiumModule;
}

const pdfWorker = {
	async rasterizePdf(pdfData: Uint8Array): Promise<Uint8Array> {
		const mod = await ensurePdfium();
		const { pdfium } = mod;

		// Load document
		const dataPtr = pdfium.wasmExports.malloc(pdfData.length);
		(pdfium as any).HEAP8.set(pdfData, dataPtr);

		const doc = mod.FPDF_LoadMemDocument(dataPtr, pdfData.length, "");
		if (!doc) {
			pdfium.wasmExports.free(dataPtr);
			throw new Error("Failed to load PDF document");
		}

		try {
			const pageCount = mod.FPDF_GetPageCount(doc);
			if (pageCount === 0) throw new Error("PDF has no pages");

			// Render first page
			const pageIndex = 0;
			const page = mod.FPDF_LoadPage(doc, pageIndex);
			if (!page) throw new Error("Failed to load page 0");

			try {
				const width = Math.ceil(mod.FPDF_GetPageWidth(page));
				const height = Math.ceil(mod.FPDF_GetPageHeight(page));
				const scale = 1.0;
				const renderWidth = Math.ceil(width * scale);
				const renderHeight = Math.ceil(height * scale);

				// 4 bytes per pixel (BGRA or RGBA depending on platform, usually BGRA for PDFium)
				const bitmap = mod.FPDFBitmap_Create(renderWidth, renderHeight, 0);
				// Fill with white
				mod.FPDFBitmap_FillRect(
					bitmap,
					0,
					0,
					renderWidth,
					renderHeight,
					0xffffffff,
				);

				mod.FPDF_RenderPageBitmap(
					bitmap,
					page,
					0,
					0,
					renderWidth,
					renderHeight,
					0,
					0, // Flags
				);

				const buffer = mod.FPDFBitmap_GetBuffer(bitmap);
				const stride = mod.FPDFBitmap_GetStride(bitmap); // Bytes per row

				const canvas = new OffscreenCanvas(renderWidth, renderHeight);
				const ctx = canvas.getContext("2d");
				if (!ctx) throw new Error("Failed to create OffscreenCanvas context");

				const length = stride * renderHeight;
				const rawData = new Uint8Array(
					(pdfium as any).HEAPU8.buffer,
					buffer,
					length,
				);
				const imageData = ctx.createImageData(renderWidth, renderHeight);

				for (let i = 0; i < rawData.length; i += 4) {
					// BGRA -> RGBA
					imageData.data[i] = rawData[i + 2]; // R
					imageData.data[i + 1] = rawData[i + 1]; // G
					imageData.data[i + 2] = rawData[i]; // B
					imageData.data[i + 3] = 255; // A (force opaque)
				}

				ctx.putImageData(imageData, 0, 0);
				const blob = await canvas.convertToBlob({ type: "image/png" });
				const arrayBuffer = await blob.arrayBuffer();

				mod.FPDFBitmap_Destroy(bitmap);
				return new Uint8Array(arrayBuffer);
			} finally {
				mod.FPDF_ClosePage(page);
			}
		} finally {
			mod.FPDF_CloseDocument(doc);
			pdfium.wasmExports.free(dataPtr);
		}
	},

	async getPageCount(pdfData: Uint8Array): Promise<number> {
		const mod = await ensurePdfium();
		const { pdfium } = mod;

		const dataPtr = pdfium.wasmExports.malloc(pdfData.length);
		(pdfium as any).HEAP8.set(pdfData, dataPtr);

		const doc = mod.FPDF_LoadMemDocument(dataPtr, pdfData.length, "");
		if (!doc) {
			pdfium.wasmExports.free(dataPtr);
			throw new Error("Failed to load PDF document");
		}

		try {
			return mod.FPDF_GetPageCount(doc);
		} finally {
			mod.FPDF_CloseDocument(doc);
			pdfium.wasmExports.free(dataPtr);
		}
	},

	async renderThumbnails(pdfData: Uint8Array, scale: number = 0.5) {
		const mod = await ensurePdfium();
		const { pdfium } = mod;

		const dataPtr = pdfium.wasmExports.malloc(pdfData.length);
		(pdfium as any).HEAP8.set(pdfData, dataPtr);

		const doc = mod.FPDF_LoadMemDocument(dataPtr, pdfData.length, "");
		if (!doc) {
			pdfium.wasmExports.free(dataPtr);
			throw new Error("Failed to load PDF document");
		}

		try {
			const count = mod.FPDF_GetPageCount(doc);
			const thumbnails = [];

			for (let i = 0; i < count; i++) {
				const page = mod.FPDF_LoadPage(doc, i);
				if (!page) continue;

				try {
					const width = mod.FPDF_GetPageWidth(page);
					const height = mod.FPDF_GetPageHeight(page);
					const renderWidth = Math.ceil(width * scale);
					const renderHeight = Math.ceil(height * scale);

					const bitmap = mod.FPDFBitmap_Create(renderWidth, renderHeight, 1);
					mod.FPDFBitmap_FillRect(
						bitmap,
						0,
						0,
						renderWidth,
						renderHeight,
						0x00000000,
					); // Transparent fill

					mod.FPDF_RenderPageBitmap(
						bitmap,
						page,
						0,
						0,
						renderWidth,
						renderHeight,
						0,
						0,
					);

					const buffer = mod.FPDFBitmap_GetBuffer(bitmap);
					const stride = mod.FPDFBitmap_GetStride(bitmap);
					const length = stride * renderHeight;

					const rawData = new Uint8Array(
						(pdfium as any).HEAPU8.buffer,
						buffer,
						length,
					);
					const pixels = new Uint8ClampedArray(rawData.length);

					for (let j = 0; j < rawData.length; j += 4) {
						pixels[j] = rawData[j + 2]; // R
						pixels[j + 1] = rawData[j + 1]; // G
						pixels[j + 2] = rawData[j]; // B
						pixels[j + 3] = rawData[j + 3]; // A
					}

					thumbnails.push({
						index: i,
						width: renderWidth,
						height: renderHeight,
						pixels: pixels,
					});

					mod.FPDFBitmap_Destroy(bitmap);
				} finally {
					mod.FPDF_ClosePage(page);
				}
			}
			return thumbnails;
		} finally {
			mod.FPDF_CloseDocument(doc);
			pdfium.wasmExports.free(dataPtr);
		}
	},

	async getPageAsImage(
		pdfData: Uint8Array,
		pageIndex: number,
	): Promise<{ width: number; height: number; pixels: Uint8ClampedArray }> {
		const mod = await ensurePdfium();
		const { pdfium } = mod;

		const dataPtr = pdfium.wasmExports.malloc(pdfData.length);
		(pdfium as any).HEAP8.set(pdfData, dataPtr);

		const doc = mod.FPDF_LoadMemDocument(dataPtr, pdfData.length, "");
		if (!doc) {
			pdfium.wasmExports.free(dataPtr);
			throw new Error("Failed to load PDF document");
		}

		try {
			const page = mod.FPDF_LoadPage(doc, pageIndex);
			if (!page) throw new Error(`Failed to load page ${pageIndex}`);

			try {
				const width = Math.ceil(mod.FPDF_GetPageWidth(page));
				const height = Math.ceil(mod.FPDF_GetPageHeight(page));

				const bitmap = mod.FPDFBitmap_Create(width, height, 1);
				mod.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0x00000000); // Transparent fill

				mod.FPDF_RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, 0);

				const buffer = mod.FPDFBitmap_GetBuffer(bitmap);
				const stride = mod.FPDFBitmap_GetStride(bitmap);
				const length = stride * height;

				const rawData = new Uint8Array(
					(pdfium as any).HEAPU8.buffer,
					buffer,
					length,
				);
				const pixels = new Uint8ClampedArray(rawData.length);

				// BGRA -> RGBA
				for (let j = 0; j < rawData.length; j += 4) {
					pixels[j] = rawData[j + 2]; // R
					pixels[j + 1] = rawData[j + 1]; // G
					pixels[j + 2] = rawData[j]; // B
					pixels[j + 3] = rawData[j + 3]; // A
				}

				mod.FPDFBitmap_Destroy(bitmap);
				return { width, height, pixels };
			} finally {
				mod.FPDF_ClosePage(page);
			}
		} finally {
			mod.FPDF_CloseDocument(doc);
			pdfium.wasmExports.free(dataPtr);
		}
	},

	async extractText(pdfData: Uint8Array): Promise<string> {
		const mod = await ensurePdfium();
		const { pdfium } = mod;

		const dataPtr = pdfium.wasmExports.malloc(pdfData.length);
		(pdfium as any).HEAP8.set(pdfData, dataPtr);

		const doc = mod.FPDF_LoadMemDocument(dataPtr, pdfData.length, "");
		if (!doc) {
			pdfium.wasmExports.free(dataPtr);
			throw new Error("Failed to load PDF document");
		}

		try {
			const pageCount = mod.FPDF_GetPageCount(doc);
			let combinedText = "";

			for (let i = 0; i < pageCount; i++) {
				const page = mod.FPDF_LoadPage(doc, i);
				if (!page) continue;

				// Load text page
				const textPage = mod.FPDFText_LoadPage(page);
				if (textPage) {
					const charCount = mod.FPDFText_CountChars(textPage);
					let pageText = "";
					if (charCount > 0) {
						for (let c = 0; c < charCount; c++) {
							const unicode = mod.FPDFText_GetUnicode(textPage, c);
							if (unicode !== 0) {
								pageText += String.fromCharCode(unicode);
							}
						}
					}
					combinedText += `--- Page ${i + 1} --\n${pageText}\n\n`;
					mod.FPDFText_ClosePage(textPage);
				}
				mod.FPDF_ClosePage(page);
			}
			return combinedText;
		} finally {
			mod.FPDF_CloseDocument(doc);
			pdfium.wasmExports.free(dataPtr);
		}
	},

	async imageToPdf(
		_imageData: Uint8Array,
		_mimeType: string,
	): Promise<Uint8Array> {
		throw new Error("imageToPdf is not yet implemented with PDFium.");
	},

	async mergePdfs(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
		const mod = await ensurePdfium();
		const { pdfium } = mod;

		const newDoc = mod.FPDF_CreateNewDocument();
		if (!newDoc) throw new Error("Failed to create new PDF document");

		try {
			for (const buffer of pdfBuffers) {
				const dataPtr = pdfium.wasmExports.malloc(buffer.length);
				(pdfium as any).HEAP8.set(buffer, dataPtr);
				const srcDoc = mod.FPDF_LoadMemDocument(dataPtr, buffer.length, "");

				if (srcDoc) {
					const srcPageCount = mod.FPDF_GetPageCount(srcDoc);
					if (srcPageCount > 0) {
						const range = `1-${srcPageCount}`;
						mod.FPDF_ImportPages(
							newDoc,
							srcDoc,
							range,
							mod.FPDF_GetPageCount(newDoc),
						);
					}
					mod.FPDF_CloseDocument(srcDoc);
				}
				pdfium.wasmExports.free(dataPtr);
			}

			const writer = mod.PDFiumExt_OpenFileWriter();
			mod.PDFiumExt_SaveAsCopy(writer, newDoc);
			const size = mod.PDFiumExt_GetFileWriterSize(writer);
			const bufferPtr = pdfium.wasmExports.malloc(size);
			mod.PDFiumExt_GetFileWriterData(writer, bufferPtr, size);
			const resultBuffer = new Uint8Array(
				(pdfium as any).HEAPU8.slice(bufferPtr, bufferPtr + size),
			);
			pdfium.wasmExports.free(bufferPtr);
			mod.PDFiumExt_CloseFileWriter(writer);

			return resultBuffer;
		} finally {
			mod.FPDF_CloseDocument(newDoc);
		}
	},

	async extractPages(
		pdfData: Uint8Array,
		pageIndices: number[],
	): Promise<Uint8Array> {
		const mod = await ensurePdfium();
		const { pdfium } = mod;

		const dataPtr = pdfium.wasmExports.malloc(pdfData.length);
		(pdfium as any).HEAP8.set(pdfData, dataPtr);
		const srcDoc = mod.FPDF_LoadMemDocument(dataPtr, pdfData.length, "");
		if (!srcDoc) {
			pdfium.wasmExports.free(dataPtr);
			throw new Error("Failed to load source PDF");
		}

		const newDoc = mod.FPDF_CreateNewDocument();

		try {
			// range logic
			const range = pageIndices.map((i) => i + 1).join(",");
			mod.FPDF_ImportPages(newDoc, srcDoc, range, 0);

			const writer = mod.PDFiumExt_OpenFileWriter();
			mod.PDFiumExt_SaveAsCopy(writer, newDoc);
			const size = mod.PDFiumExt_GetFileWriterSize(writer);
			const bufferPtr = pdfium.wasmExports.malloc(size);
			mod.PDFiumExt_GetFileWriterData(writer, bufferPtr, size);
			const resultBuffer = new Uint8Array(
				(pdfium as any).HEAPU8.slice(bufferPtr, bufferPtr + size),
			);
			pdfium.wasmExports.free(bufferPtr);
			mod.PDFiumExt_CloseFileWriter(writer);

			return resultBuffer;
		} finally {
			mod.FPDF_CloseDocument(newDoc);
			mod.FPDF_CloseDocument(srcDoc);
			pdfium.wasmExports.free(dataPtr);
		}
	},

	async resizePdf(
		_pdfData: Uint8Array,
		_width: number,
		_height: number,
	): Promise<Uint8Array> {
		throw new Error("resizePdf is not yet implemented with PDFium.");
	},

	async getFonts(_pdfData: Uint8Array): Promise<any[]> {
		throw new Error("getFonts is not yet implemented with PDFium.");
	},
};

export type PdfWorker = typeof pdfWorker;

Comlink.expose(pdfWorker);
