import * as Comlink from "comlink";
import type { Options } from "prettier";
import pluginAcorn from "prettier/plugins/acorn";
import pluginAngular from "prettier/plugins/angular";
import pluginBabel from "prettier/plugins/babel";
import pluginEstree from "prettier/plugins/estree";
import pluginFlow from "prettier/plugins/flow";
import pluginGlimmer from "prettier/plugins/glimmer";
import pluginGraphql from "prettier/plugins/graphql";
import pluginHtml from "prettier/plugins/html";
import pluginMarkdown from "prettier/plugins/markdown";
import pluginMeriyah from "prettier/plugins/meriyah";
import pluginPostcss from "prettier/plugins/postcss";
import pluginTypeScript from "prettier/plugins/typescript";
import pluginYaml from "prettier/plugins/yaml";
import prettier from "prettier/standalone";

const plugins = [
	pluginEstree,
	pluginAcorn,
	pluginAngular,
	pluginBabel,
	pluginFlow,
	pluginGlimmer,
	pluginGraphql,
	pluginHtml,
	pluginMarkdown,
	pluginMeriyah,
	pluginPostcss,
	pluginTypeScript,
	pluginYaml,
];

const prettierWorker = {
	async format(code: string, options: Options): Promise<string> {
		return prettier.format(code, {
			...options,
			plugins,
		});
	},
};

export type PrettierWorker = typeof prettierWorker;

Comlink.expose(prettierWorker);
