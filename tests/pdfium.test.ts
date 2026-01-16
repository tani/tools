import { describe, expect, it } from "bun:test";
import { pdfWorker } from "../src/workers/pdf-worker";

// Create a minimal valid PDF 1.7 file
function createMinimalPdf(): Uint8Array {
	const content =
		"%PDF-1.7\n" +
		"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
		"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
		"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>\nendobj\n" +
		"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n" +
		"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n203\n%%EOF";

	const encoder = new TextEncoder();
	return encoder.encode(content);
}

// Mock OffscreenCanvas for Bun environment as it's not available globally
if (typeof OffscreenCanvas === "undefined") {
	class MockOffscreenCanvas {
		width: number;
		height: number;
		constructor(width: number, height: number) {
			this.width = width;
			this.height = height;
		}
		getContext(type: string) {
			if (type === "2d") {
				return {
					createImageData: (w: number, h: number) => ({
						data: new Uint8ClampedArray(w * h * 4),
					}),
					putImageData: () => {},
				};
			}
			return null;
		}
		convertToBlob() {
			return Promise.resolve(
				new Blob([new Uint8Array(100)], { type: "image/png" }),
			);
		}
	}
	(
		globalThis as unknown as { OffscreenCanvas: typeof MockOffscreenCanvas }
	).OffscreenCanvas = MockOffscreenCanvas;
}

describe("PDF Worker with Toy PDF", () => {
	const pdfData = createMinimalPdf();

	it("should get page count", async () => {
		const count = await pdfWorker.getPageCount(pdfData);
		expect(count).toBe(1);
	});

	it("should render thumbnails", async () => {
		const thumbnails = await pdfWorker.renderThumbnails(pdfData, 0.5);
		expect(thumbnails.length).toBe(1);
		const thumb = thumbnails[0];
		expect(thumb.index).toBe(0);
		// 612 * 0.5 = 306, 792 * 0.5 = 396
		expect(thumb.width).toBe(306);
		expect(thumb.height).toBe(396);
		expect(thumb.pixels).toBeInstanceOf(Uint8ClampedArray);
		expect(thumb.pixels.length).toBe(306 * 396 * 4);
	});

	it("should rasterize PDF (first page)", async () => {
		const imageBuffer = await pdfWorker.rasterizePdf(pdfData);
		expect(imageBuffer).toBeInstanceOf(Uint8Array);
		expect(imageBuffer.length).toBeGreaterThan(0);
	});

	it("should get page as image", async () => {
		const image = await pdfWorker.getPageAsImage(pdfData, 0);
		expect(image.width).toBe(612);
		expect(image.height).toBe(792);
		expect(image.pixels).toBeInstanceOf(Uint8ClampedArray);
	});

	it("should extract text", async () => {
		// The toy PDF has no text content, but it should return a string (likely empty or page marker)
		const text = await pdfWorker.extractText(pdfData);
		expect(typeof text).toBe("string");
		// Our implementation adds "--- Page 1 --" markers
		expect(text).toContain("--- Page 1 --");
	});

	// PDFiumExt_SaveAsCopy crashes in Bun environment with OOB error, possibly due to WASM memory handling differences
	it("should merge PDFs", async () => {
		// Merge specific logic: it imports pages from sources to a new doc
		const merged = await pdfWorker.mergePdfs([pdfData, pdfData]);
		expect(merged).toBeInstanceOf(Uint8Array);
		expect(merged.length).toBeGreaterThan(0);

		// Verify merged PDF has 2 pages
		const count = await pdfWorker.getPageCount(merged);
		expect(count).toBe(2);
	});

	it("should extract pages", async () => {
		// We only have 1 page (index 0)
		const extracted = await pdfWorker.extractPages(pdfData, [0]);
		expect(extracted).toBeInstanceOf(Uint8Array);
		expect(extracted.length).toBeGreaterThan(0);

		const count = await pdfWorker.getPageCount(extracted);
		expect(count).toBe(1);
	});

	it("should get fonts (empty for minimal PDF)", async () => {
		const fonts = await pdfWorker.getFonts(pdfData);
		expect(Array.isArray(fonts)).toBe(true);
		// Minimal PDF has no text objects, so no fonts
		expect(fonts.length).toBe(0);
	});

	it("should get fonts from a PDF with multiple fonts", async () => {
		const { ensurePdfium, savePdf } = await import("../src/workers/pdf-worker");
		const mod = await ensurePdfium();
		const { pdfium } = mod;

		const doc = mod.FPDF_CreateNewDocument();
		const page = mod.FPDFPage_New(doc, 0, 612, 792);

		const addText = (fontName: string, text: string, y: number) => {
			const font = mod.FPDFText_LoadStandardFont(doc, fontName);
			const textObj = mod.FPDFPageObj_CreateTextObj(doc, font, 12);

			// Set position via matrix
			const matrixPtr = pdfium.wasmExports.malloc(24);
			pdfium.setValue(matrixPtr, 1, "float"); // a
			pdfium.setValue(matrixPtr + 4, 0, "float"); // b
			pdfium.setValue(matrixPtr + 8, 0, "float"); // c
			pdfium.setValue(matrixPtr + 12, 1, "float"); // d
			pdfium.setValue(matrixPtr + 16, 100, "float"); // e (x)
			pdfium.setValue(matrixPtr + 20, y, "float"); // f (y)
			mod.FPDFPageObj_SetMatrix(textObj, matrixPtr);
			pdfium.wasmExports.free(matrixPtr);

			// Set text (WideString)
			const textPtr = pdfium.wasmExports.malloc((text.length + 1) * 2);
			pdfium.stringToUTF16(text, textPtr, (text.length + 1) * 2);
			mod.FPDFText_SetText(textObj, textPtr);
			pdfium.wasmExports.free(textPtr);

			mod.FPDFPage_InsertObject(page, textObj);
		};

		addText("Helvetica", "Hello Helvetica", 700);
		addText("Times-Roman", "Hello Times", 650);

		mod.FPDFPage_GenerateContent(page);
		const complexPdfData = savePdf(mod, doc);

		mod.FPDF_ClosePage(page);
		mod.FPDF_CloseDocument(doc);

		const fonts = await pdfWorker.getFonts(complexPdfData);
		expect(fonts.length).toBeGreaterThanOrEqual(2);

		const fontNames = fonts.map((f) => f.name);
		expect(
			fontNames.some((n) => n.includes("Helvetica") || n.includes("Arial")),
		).toBe(true);
		expect(
			fontNames.some((n) => n.includes("Times") || n.includes("Roman")),
		).toBe(true);
	});

	it("should resize PDF", async () => {
		// Minimal PDF is 612x792 (PostScript points)
		const newWidth = 306;
		const newHeight = 396;
		const resized = await pdfWorker.resizePdf(pdfData, newWidth, newHeight);

		expect(resized).toBeInstanceOf(Uint8Array);
		expect(resized.length).toBeGreaterThan(0);

		// Verify size using getPageAsImage (which gets width/height from page)
		const img = await pdfWorker.getPageAsImage(resized, 0);
		expect(img.width).toBe(newWidth);
		expect(img.height).toBe(newHeight);
	});

	it("should convert image to PDF", async () => {
		// Use a tiny dummy buffer; the worker fallback handles this as a 1x1 image for testing
		const dummyImg = new Uint8Array([0, 0, 0, 0]);
		const pdf = await pdfWorker.imageToPdf(dummyImg, "image/png");

		expect(pdf).toBeInstanceOf(Uint8Array);
		expect(pdf.length).toBeGreaterThan(0);

		// Verify PDF has 1 page
		const count = await pdfWorker.getPageCount(pdf);
		expect(count).toBe(1);
	});
});
