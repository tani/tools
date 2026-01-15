declare module "*.vue" {
	import type { DefineComponent } from "vue";
	const component: DefineComponent<object, object, Record<string, unknown>>;
	export default component;
}

declare module "prettier/standalone";
declare module "prettier/plugins/*";
declare module "prismjs/components/*" {
	const module: unknown;
	export default module;
}

declare module "vscode-oniguruma/release/onig.wasm?url" {
	const url: string;
	export default url;
}

declare module "gifenc";
