import websrScriptUrl from "@websr/websr/dist/websr.js?url";

export type WebSRConstructor = {
	new (params: {
		network_name: string;
		weights: unknown;
		gpu: unknown;
		canvas: OffscreenCanvas;
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
