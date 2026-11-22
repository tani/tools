import websrScriptUrl from "@websr/websr/dist/websr.js?url";
import large3d from "websr-weights/weights/anime4k/cnn-2x-l-3d.json";
import largeAnime from "websr-weights/weights/anime4k/cnn-2x-l-an.json";
import largeRealLife from "websr-weights/weights/anime4k/cnn-2x-l-rl.json";
import medium3d from "websr-weights/weights/anime4k/cnn-2x-m-3d.json";
import mediumAnime from "websr-weights/weights/anime4k/cnn-2x-m-an.json";
import mediumRealLife from "websr-weights/weights/anime4k/cnn-2x-m-rl.json";
import small3d from "websr-weights/weights/anime4k/cnn-2x-s-3d.json";
import smallAnime from "websr-weights/weights/anime4k/cnn-2x-s-an.json";
import smallRealLife from "websr-weights/weights/anime4k/cnn-2x-s-rl.json";

// WebSR 0.1 no longer bundles weights. The pinned asset package keeps them local.
const weights = {
	s: { an: smallAnime, rl: smallRealLife, "3d": small3d },
	m: { an: mediumAnime, rl: mediumRealLife, "3d": medium3d },
	l: { an: largeAnime, rl: largeRealLife, "3d": large3d },
};

export const getWebSRModel = (
	size: keyof typeof weights,
	type: keyof (typeof weights)["s"],
) => ({
	network_name: `anime4k/cnn-2x-${size}`,
	weights: weights[size][type],
});

export type WebSRConstructor = {
	new (params: {
		network_name: string;
		weights: unknown;
		gpu: unknown;
		canvas: HTMLCanvasElement | OffscreenCanvas;
	}): {
		render(source: ImageBitmap): Promise<void>;
	};
	initWebGPU(): Promise<unknown>;
};

const getWebSRGlobal = () => {
	const candidate = (globalThis as { WebSR?: WebSRConstructor }).WebSR;
	return candidate ?? null;
};

let websrLoadPromise: Promise<WebSRConstructor> | null = null;

export const loadWebSR = async (): Promise<WebSRConstructor> => {
	const existing = getWebSRGlobal();
	if (existing) return existing;

	if (!websrLoadPromise) {
		websrLoadPromise = new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = websrScriptUrl;
			script.async = true;
			script.onload = () => {
				const loaded = getWebSRGlobal();
				if (loaded) {
					resolve(loaded);
					return;
				}
				reject(new Error("WebSR loaded but global WebSR is unavailable."));
			};
			script.onerror = () => {
				reject(new Error("Failed to load WebSR script."));
			};
			document.head.appendChild(script);
		});
	}

	return websrLoadPromise;
};
