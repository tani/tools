import { createUnplugin } from "unplugin";

export default createUnplugin(() => {
	return {
		name: "nodelibs-polyfill",
		vite: {
			enforce: "pre",
			config() {
				return {
					resolve: {
						alias: [
							{
								find: /^(node:)?(crypto|vm|zlib)$/,
								replacement: import.meta.url.replace(/\/[^/]+$/, "/empty.cjs"),
							},
							{
								find: /^(node:)?(buffer|fs|path|process|stream|util|module|url|events|crypto|os|http|https|assert|console|constants|readline|timers|tty|string_decoder)\/?$/,
								replacement: "@jspm/core/nodelibs/$2",
							},
						],
					},
				};
			},
		},
	};
});
