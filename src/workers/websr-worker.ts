import WebSR from "@websr/websr";
// Import weights
import cnn2xLarge3D from "@websr/websr/weights/anime4k/cnn-2x-l-3d.json";
import cnn2xLargeAnime from "@websr/websr/weights/anime4k/cnn-2x-l-an.json";
import cnn2xLargeRealLife from "@websr/websr/weights/anime4k/cnn-2x-l-rl.json";
import cnn2xMedium3D from "@websr/websr/weights/anime4k/cnn-2x-m-3d.json";
import cnn2xMediumAnime from "@websr/websr/weights/anime4k/cnn-2x-m-an.json";
import cnn2xMediumRealLife from "@websr/websr/weights/anime4k/cnn-2x-m-rl.json";
import cnn2xSmall3D from "@websr/websr/weights/anime4k/cnn-2x-s-3d.json";
import cnn2xSmallAnime from "@websr/websr/weights/anime4k/cnn-2x-s-an.json";
import cnn2xSmallRealLife from "@websr/websr/weights/anime4k/cnn-2x-s-rl.json";
import * as Comlink from "comlink";

const weightsMap: Record<string, unknown> = {
	"s-an": cnn2xSmallAnime,
	"m-an": cnn2xMediumAnime,
	"l-an": cnn2xLargeAnime,
	"s-rl": cnn2xSmallRealLife,
	"m-rl": cnn2xMediumRealLife,
	"l-rl": cnn2xLargeRealLife,
	"s-3d": cnn2xSmall3D,
	"m-3d": cnn2xMedium3D,
	"l-3d": cnn2xLarge3D,
};

const networkNameMap: Record<string, string> = {
	s: "anime4k/cnn-2x-s",
	m: "anime4k/cnn-2x-m",
	l: "anime4k/cnn-2x-l",
};

// biome-ignore lint/suspicious/noExplicitAny: GPUDevice type is not available in the worker environment
let gpu: any = null;

const websrWorker = {
	async init(): Promise<boolean> {
		try {
			const device = await WebSR.initWebGPU();
			if (device) {
				gpu = device;
				return true;
			}
			return false;
		} catch (e) {
			console.error(e);
			return false;
		}
	},

	async upscale(
		imageBitmap: ImageBitmap,
		size: "s" | "m" | "l",
		type: "an" | "rl" | "3d",
	): Promise<ImageBitmap> {
		if (!gpu) {
			const success = await this.init();
			if (!success) throw new Error("WebGPU initialization failed");
		}

		const canvas = new OffscreenCanvas(
			imageBitmap.width * 2,
			imageBitmap.height * 2,
		);

		const websr = new WebSR({
			// biome-ignore lint/suspicious/noExplicitAny: NetworkName type is specific to WebSR
			network_name: networkNameMap[size] as any,
			weights: weightsMap[`${size}-${type}`],
			gpu: gpu,
			// biome-ignore lint/suspicious/noExplicitAny: OffscreenCanvas is compatible but types might differ
			canvas: canvas as any,
		});

		await websr.render(imageBitmap);

		return canvas.transferToImageBitmap();
	},
};

export type WebsrWorker = typeof websrWorker;

Comlink.expose(websrWorker);
