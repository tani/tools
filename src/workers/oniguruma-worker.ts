import * as Comlink from "comlink";
import { loadWASM, OnigScanner, OnigString } from "vscode-oniguruma";
import onigWasm from "vscode-oniguruma/release/onig.wasm?url";

let wasmPromise: Promise<void> | null = null;

async function ensureWasm() {
	if (!wasmPromise) {
		const response = await fetch(onigWasm);
		wasmPromise = loadWASM(response);
	}
	await wasmPromise;
}

const onigurumaWorker = {
	async findMatches(
		text: string,
		pattern: string,
		flags = "",
		maxMatches = 1000,
	) {
		await ensureWasm();

		const rawFlags = flags.replace(/\s+/g, "").trim();
		const effectivePattern = rawFlags ? `(?${rawFlags})${pattern}` : pattern;

		try {
			const scanner = new OnigScanner([effectivePattern]);
			const onigString = new OnigString(text);
			const matches: { start: number; end: number; value: string }[] = [];
			let truncated = false;
			let offset = 0;

			while (offset <= text.length) {
				const match = scanner.findNextMatchSync(onigString, offset);
				if (!match) break;

				const capture = match.captureIndices[0];
				const start = capture.start;
				const end = capture.end;
				const value = text.slice(start, end);

				matches.push({ start, end, value });

				if (matches.length >= maxMatches) {
					truncated = true;
					break;
				}

				// Advance offset. If empty match, advance by 1 to avoid infinite loop.
				offset = end === start ? start + 1 : end;
			}

			scanner.dispose();
			onigString.dispose();

			return { matches, truncated, error: null };
		} catch (error) {
			return {
				matches: [],
				truncated: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},

	async replace(
		text: string,
		pattern: string,
		replacement: string,
		flags = "",
	) {
		await ensureWasm();

		const rawFlags = flags.replace(/\s+/g, "").trim();
		const effectivePattern = rawFlags ? `(?${rawFlags})${pattern}` : pattern;

		try {
			const scanner = new OnigScanner([effectivePattern]);
			const onigString = new OnigString(text);
			let result = "";
			let offset = 0;

			while (offset <= text.length) {
				const match = scanner.findNextMatchSync(onigString, offset);
				if (!match) {
					result += text.slice(offset);
					break;
				}

				const capture = match.captureIndices[0];
				result += text.slice(offset, capture.start);

				const currentReplacement = replacement.replace(
					/\$([0-9]+|&)/g,
					(m, p1) => {
						if (p1 === "&") return text.slice(capture.start, capture.end);
						const index = parseInt(p1, 10);
						if (index < match.captureIndices.length) {
							const cap = match.captureIndices[index];
							return text.slice(cap.start, cap.end);
						}
						return m;
					},
				);

				result += currentReplacement;
				offset = capture.end === capture.start ? capture.end + 1 : capture.end;
				if (capture.end === capture.start && offset > text.length) break;
			}

			scanner.dispose();
			onigString.dispose();

			return { result, error: null };
		} catch (error) {
			return {
				result: text,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
};

export type OnigurumaWorker = typeof onigurumaWorker;

Comlink.expose(onigurumaWorker);
