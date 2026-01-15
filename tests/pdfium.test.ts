// @ts-ignore
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
	(globalThis as any).OffscreenCanvas = class MockOffscreenCanvas {
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
	};
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

	it("should throw error for unimplemented methods", async () => {
		const dummy = new Uint8Array(0);
		await expect(pdfWorker.resizePdf(dummy, 100, 100)).rejects.toThrow(
			"not yet implemented",
		);
		await expect(pdfWorker.getFonts(dummy)).rejects.toThrow(
			"not yet implemented",
		);
		await expect(pdfWorker.imageToPdf(dummy, "image/png")).rejects.toThrow(
			"not yet implemented",
		);
	});
});
