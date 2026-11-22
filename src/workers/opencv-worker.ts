import cvModule from "@techstark/opencv-js";
import * as Comlink from "comlink";

// The OpenCV entry point resolves once its WebAssembly runtime is initialized.
const cvReady = Promise.resolve(cvModule);

const opencvWorker = {
	async process(
		imageData: ImageData,
		x: number,
		y: number,
		tolerance: number,
	): Promise<ImageData> {
		const cv = await cvReady;
		const { width, height } = imageData;

		try {
			if (x < 0 || x >= width || y < 0 || y >= height) {
				throw new Error(
					`Click point (${x}, ${y}) is outside image boundaries.`,
				);
			}

			const rgba = cv.matFromImageData(imageData);
			const src = new cv.Mat();
			cv.cvtColor(rgba, src, cv.COLOR_RGBA2RGB);

			const blurred = new cv.Mat();
			cv.medianBlur(src, blurred, 3);

			const mask = cv.Mat.zeros(height + 2, width + 2, cv.CV_8UC1);
			const seed = new cv.Point(x, y);
			const newVal = new cv.Scalar(255, 255, 255);
			const loDiff = new cv.Scalar(tolerance, tolerance, tolerance);
			const upDiff = new cv.Scalar(tolerance, tolerance, tolerance);

			const flags =
				8 | (255 << 8) | cv.FLOODFILL_MASK_ONLY | cv.FLOODFILL_FIXED_RANGE;
			cv.floodFill(
				blurred,
				mask,
				seed,
				newVal,
				new cv.Rect(),
				loDiff,
				upDiff,
				flags,
			);

			const rect = new cv.Rect(1, 1, width, height);
			const rawMask = mask.roi(rect);

			const finalMask = cv.Mat.zeros(height, width, cv.CV_8UC1);
			const kernel = cv.getStructuringElement(
				cv.MORPH_ELLIPSE,
				new cv.Size(3, 3),
			);
			cv.morphologyEx(rawMask, finalMask, cv.MORPH_CLOSE, kernel);

			const resultData = new Uint8ClampedArray(imageData.data);
			const maskData = finalMask.data;
			for (let i = 0; i < maskData.length; i++) {
				if (maskData[i] === 255) {
					resultData[i * 4 + 3] = 0;
				}
			}

			return new ImageData(resultData, width, height);
		} catch (error) {
			console.error("Error in floodFill:", error);
			return imageData;
		}
	},

	async globalRemoval(
		imageData: ImageData,
		x: number,
		y: number,
		tolerance: number,
	): Promise<ImageData> {
		const { width, height } = imageData;
		const idx = (y * width + x) * 4;
		const sr = imageData.data[idx];
		const sg = imageData.data[idx + 1];
		const sb = imageData.data[idx + 2];

		const resultData = new Uint8ClampedArray(imageData.data);
		const tSq = tolerance * tolerance * 3;

		for (let i = 0; i < resultData.length; i += 4) {
			const r = resultData[i];
			const g = resultData[i + 1];
			const b = resultData[i + 2];
			const distSq = (r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2;
			if (distSq < tSq) {
				resultData[i + 3] = 0;
			}
		}

		return new ImageData(resultData, width, height);
	},

	async grabCut(
		imageData: ImageData,
		rect: { left: number; top: number; width: number; height: number },
	): Promise<ImageData> {
		const cv = await cvReady;
		const { width, height } = imageData;

		try {
			const MAX_DIM = 600;
			const scale = Math.min(1.0, MAX_DIM / Math.max(width, height));
			const smallWidth = Math.round(width * scale);
			const smallHeight = Math.round(height * scale);

			const rgba = cv.matFromImageData(imageData);
			const src = new cv.Mat();
			cv.cvtColor(rgba, src, cv.COLOR_RGBA2RGB);

			const smallSrc = new cv.Mat();
			cv.resize(
				src,
				smallSrc,
				new cv.Size(smallWidth, smallHeight),
				0,
				0,
				cv.INTER_AREA,
			);

			const smallMask = cv.Mat.zeros(smallHeight, smallWidth, cv.CV_8UC1);
			const bgdModel = new cv.Mat();
			const fgdModel = new cv.Mat();

			const smallRect = new cv.Rect(
				Math.max(0, Math.round(rect.left * scale)),
				Math.max(0, Math.round(rect.top * scale)),
				Math.min(
					Math.round(rect.width * scale),
					smallWidth - Math.round(rect.left * scale),
				),
				Math.min(
					Math.round(rect.height * scale),
					smallHeight - Math.round(rect.top * scale),
				),
			);

			cv.grabCut(
				smallSrc,
				smallMask,
				smallRect,
				bgdModel,
				fgdModel,
				5,
				cv.GC_INIT_WITH_RECT,
			);

			const mask = new cv.Mat();
			cv.resize(
				smallMask,
				mask,
				new cv.Size(width, height),
				0,
				0,
				cv.INTER_NEAREST,
			);

			const resultData = new Uint8ClampedArray(imageData.data);
			const maskData = mask.data;
			for (let i = 0; i < maskData.length; i++) {
				const val = maskData[i];
				if (val === 0 || val === 2) {
					resultData[i * 4 + 3] = 0;
				}
			}

			return new ImageData(resultData, width, height);
		} catch (error) {
			console.error("Error in grabCut:", error);
			return imageData;
		}
	},
};

export type OpencvWorker = typeof opencvWorker;

Comlink.expose(opencvWorker);
