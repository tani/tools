<script setup lang="ts">
import * as Comlink from "comlink";
import { computed, onMounted, ref, watch } from "vue";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";
import type { OnigurumaWorker } from "../workers/oniguruma-worker";

type Production = string[];

type Grammar = {
	startSymbol: string;
	nonTerminals: string[];
	terminals: string[];
	productions: Map<string, Production[]>;
};

type ParseResult = {
	grammar: Grammar | null;
	errors: string[];
};

const epsilonTokens = new Set(["ε", "epsilon", "eps", "EPS", "lambda", "Λ"]);

const worker = ref<Comlink.Remote<OnigurumaWorker> | null>(null);
const isWorkerReady = ref(false);
const onigurumaWorkerUrl = new URL(
	"../workers/oniguruma-worker.ts",
	import.meta.url,
);

onMounted(() => {
	const w = new Worker(onigurumaWorkerUrl, { type: "module" });
	worker.value = Comlink.wrap<OnigurumaWorker>(w);
	isWorkerReady.value = true;
});

function normalizeSymbol(symbol: string): string {
	const trimmed = symbol.trim();
	if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
		return trimmed.slice(1, -1).trim();
	}
	return trimmed;
}

function splitAlternatives(value: string): string[] {
	const alternatives: string[] = [];
	let buffer = "";
	let quote: "" | "'" | '"' = "";

	for (let i = 0; i < value.length; i += 1) {
		const char = value[i];
		if (char === "'" || char === '"') {
			if (quote === "") {
				quote = char;
			} else if (quote === char) {
				quote = "";
			}
			buffer += char;
			continue;
		}
		if (char === "|" && quote === "") {
			alternatives.push(buffer.trim());
			buffer = "";
			continue;
		}
		buffer += char;
	}
	if (buffer.trim()) {
		alternatives.push(buffer.trim());
	}
	return alternatives;
}

function tokenizeProduction(value: string): string[] {
	const tokens: string[] = [];
	const regex = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|[^\s]+/g;
	for (const match of value.matchAll(regex)) {
		tokens.push(match[0]);
	}
	return tokens;
}

function decodeToken(raw: string): string {
	const trimmed = raw.trim();
	if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
		return normalizeSymbol(trimmed);
	}
	if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
		return trimmed.slice(1, -1).replaceAll("\\'", "'");
	}
	if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
		return trimmed.slice(1, -1).replaceAll('\\"', '"');
	}
	return trimmed;
}

function productionKey(head: string, body: Production): string {
	return `${head}→${body.join(" ")}`;
}

function cloneGrammar(grammar: Grammar): Grammar {
	const productions = new Map<string, Production[]>();
	for (const [head, bodies] of grammar.productions) {
		productions.set(
			head,
			bodies.map((body) => [...body]),
		);
	}
	return {
		startSymbol: grammar.startSymbol,
		nonTerminals: [...grammar.nonTerminals],
		terminals: [...grammar.terminals],
		productions,
	};
}

function refreshTerminals(grammar: Grammar): void {
	const terminals = new Set<string>();
	for (const bodies of grammar.productions.values()) {
		for (const body of bodies) {
			for (const symbol of body) {
				if (!grammar.nonTerminals.includes(symbol)) {
					terminals.add(symbol);
				}
			}
		}
	}
	grammar.terminals = [...terminals];
}

function parseBnf(input: string, startSymbol?: string): ParseResult {
	const errors: string[] = [];
	const productions = new Map<string, Production[]>();
	const nonTerminalOrder: string[] = [];

	const lines = input.split(/\r?\n/);
	for (const [index, rawLine] of lines.entries()) {
		const line = rawLine
			.replace(/#.*/, "")
			.replace(/\/\/.*/, "")
			.trim();
		if (!line) continue;
		const match = line.match(/^(.*?)\s*(::=|->)\s*(.+)$/);
		if (!match) {
			errors.push(`Line ${index + 1}: expected ":=" or "->" rule.`);
			continue;
		}
		const rawHead = normalizeSymbol(match[1]);
		if (!rawHead) {
			errors.push(`Line ${index + 1}: missing nonterminal on the left.`);
			continue;
		}
		if (!productions.has(rawHead)) {
			productions.set(rawHead, []);
			nonTerminalOrder.push(rawHead);
		}
		const rhs = match[3].trim();
		const alternatives = splitAlternatives(rhs);
		if (alternatives.length === 0) {
			errors.push(`Line ${index + 1}: missing production alternatives.`);
			continue;
		}

		for (const alternative of alternatives) {
			if (!alternative || epsilonTokens.has(alternative)) {
				productions.get(rawHead)?.push([]);
				continue;
			}
			const rawTokens = tokenizeProduction(alternative);
			if (rawTokens.length === 0) {
				productions.get(rawHead)?.push([]);
				continue;
			}
			const decoded = rawTokens.map((token) => decodeToken(token));
			if (decoded.length === 1 && epsilonTokens.has(decoded[0])) {
				productions.get(rawHead)?.push([]);
				continue;
			}
			productions.get(rawHead)?.push(decoded);
		}
	}

	if (productions.size === 0) {
		return {
			grammar: null,
			errors: errors.length ? errors : ["No productions found."],
		};
	}

	const start = startSymbol?.trim() || nonTerminalOrder[0];
	if (!start) {
		return {
			grammar: null,
			errors: [...errors, "Unable to determine a start symbol."],
		};
	}
	if (!productions.has(start)) {
		errors.push(`Start symbol "${start}" is not defined.`);
	}

	const grammar: Grammar = {
		startSymbol: start,
		nonTerminals: nonTerminalOrder,
		terminals: [],
		productions,
	};
	refreshTerminals(grammar);
	return { grammar, errors };
}

function buildNullableSet(grammar: Grammar): Set<string> {
	const nullable = new Set<string>();
	let changed = true;
	while (changed) {
		changed = false;
		for (const [head, bodies] of grammar.productions) {
			if (nullable.has(head)) continue;
			for (const body of bodies) {
				if (body.length === 0 || body.every((symbol) => nullable.has(symbol))) {
					nullable.add(head);
					changed = true;
					break;
				}
			}
		}
	}
	return nullable;
}

function eliminateEpsilon(grammar: Grammar): void {
	const nullable = buildNullableSet(grammar);
	const startSymbol = grammar.startSymbol;
	const newProductions = new Map<string, Production[]>();
	const seen = new Set<string>();

	for (const [head, bodies] of grammar.productions) {
		const targetBodies: Production[] = [];
		for (const body of bodies) {
			if (body.length === 0) {
				if (head === startSymbol) {
					const key = productionKey(head, body);
					if (!seen.has(key)) {
						seen.add(key);
						targetBodies.push([]);
					}
				}
				continue;
			}
			const nullableIndexes = body
				.map((symbol, index) => (nullable.has(symbol) ? index : -1))
				.filter((index) => index >= 0);
			const variantCount = 1 << nullableIndexes.length;
			for (let mask = 0; mask < variantCount; mask += 1) {
				const variant: string[] = [];
				body.forEach((symbol, index) => {
					const nullableIndex = nullableIndexes.indexOf(index);
					if (nullableIndex === -1) {
						variant.push(symbol);
						return;
					}
					const remove = (mask & (1 << nullableIndex)) !== 0;
					if (!remove) variant.push(symbol);
				});
				if (variant.length === 0 && head !== startSymbol) {
					return;
				}
				const key = productionKey(head, variant);
				if (!seen.has(key)) {
					seen.add(key);
					targetBodies.push(variant);
				}
			}
		}
		newProductions.set(head, targetBodies);
	}
	grammar.productions = newProductions;
}

function eliminateUnitProductions(grammar: Grammar): void {
	const nonTerminals = grammar.nonTerminals;
	const closure = new Map<string, Set<string>>();
	for (const head of nonTerminals) {
		closure.set(head, new Set([head]));
	}

	let changed = true;
	while (changed) {
		changed = false;
		for (const [head, bodies] of grammar.productions) {
			const reachable = closure.get(head);
			if (!reachable) continue;
			for (const body of bodies) {
				if (body.length === 1 && nonTerminals.includes(body[0])) {
					const target = body[0];
					const targetSet = closure.get(target);
					if (!targetSet) continue;
					for (const symbol of targetSet) {
						if (!reachable.has(symbol)) {
							reachable.add(symbol);
							changed = true;
						}
					}
				}
			}
		}
	}

	const newProductions = new Map<string, Production[]>();
	for (const head of nonTerminals) {
		const bodies: Production[] = [];
		const seen = new Set<string>();
		const reachable = closure.get(head) ?? new Set([head]);
		for (const target of reachable) {
			const targetBodies = grammar.productions.get(target) ?? [];
			for (const body of targetBodies) {
				if (body.length === 1 && nonTerminals.includes(body[0])) continue;
				const key = productionKey(head, body);
				if (!seen.has(key)) {
					seen.add(key);
					bodies.push([...body]);
				}
			}
		}
		newProductions.set(head, bodies);
	}
	grammar.productions = newProductions;
}

function ensureStartSymbol(grammar: Grammar): void {
	const startSymbol = grammar.startSymbol;
	const appearsInBody = [...grammar.productions.values()].some((bodies) =>
		bodies.some((body) => body.includes(startSymbol)),
	);
	const nullable = buildNullableSet(grammar).has(startSymbol);
	if (appearsInBody || nullable) {
		let index = 0;
		let newStart = `S${index}`;
		while (grammar.nonTerminals.includes(newStart)) {
			index += 1;
			newStart = `S${index}`;
		}
		grammar.nonTerminals.unshift(newStart);
		grammar.productions.set(newStart, [[startSymbol]]);
		grammar.startSymbol = newStart;
	}
}

function replaceTerminalsInLongBodies(grammar: Grammar): void {
	const terminalMap = new Map<string, string>();
	const used = new Set(grammar.nonTerminals);
	const newProductions = new Map<string, Production[]>();

	const getTerminalNonTerminal = (terminal: string): string => {
		const existing = terminalMap.get(terminal);
		if (existing) return existing;
		let base = `T_${terminal.replace(/[^a-zA-Z0-9]+/g, "_")}`;
		if (!base || base === "T_") base = "T";
		let candidate = base;
		let index = 1;
		while (used.has(candidate)) {
			candidate = `${base}_${index}`;
			index += 1;
		}
		used.add(candidate);
		terminalMap.set(terminal, candidate);
		grammar.nonTerminals.push(candidate);
		return candidate;
	};

	for (const [head, bodies] of grammar.productions) {
		const updatedBodies: Production[] = [];
		for (const body of bodies) {
			if (body.length <= 1) {
				updatedBodies.push([...body]);
				continue;
			}
			const mapped = body.map((symbol) => {
				if (grammar.nonTerminals.includes(symbol)) return symbol;
				const replacement = getTerminalNonTerminal(symbol);
				return replacement;
			});
			updatedBodies.push(mapped);
		}
		newProductions.set(head, updatedBodies);
	}

	for (const [terminal, replacement] of terminalMap) {
		newProductions.set(replacement, [[terminal]]);
	}
	grammar.productions = newProductions;
}

function binarizeProductions(grammar: Grammar): void {
	const used = new Set(grammar.nonTerminals);
	const newProductions = new Map<string, Production[]>();

	const createNonTerminal = (prefix: string): string => {
		let index = 1;
		let candidate = `${prefix}${index}`;
		while (used.has(candidate)) {
			index += 1;
			candidate = `${prefix}${index}`;
		}
		used.add(candidate);
		grammar.nonTerminals.push(candidate);
		return candidate;
	};

	for (const [head, bodies] of grammar.productions) {
		for (const body of bodies) {
			if (body.length <= 2) {
				const existing = newProductions.get(head) ?? [];
				existing.push([...body]);
				newProductions.set(head, existing);
				continue;
			}
			let currentHead = head;
			let remaining = [...body];
			while (remaining.length > 2) {
				const [first, ...rest] = remaining;
				const newNonTerminal = createNonTerminal("N");
				const existing = newProductions.get(currentHead) ?? [];
				existing.push([first, newNonTerminal]);
				newProductions.set(currentHead, existing);
				currentHead = newNonTerminal;
				remaining = rest;
			}
			const existing = newProductions.get(currentHead) ?? [];
			existing.push(remaining);
			newProductions.set(currentHead, existing);
		}
	}
	grammar.productions = newProductions;
}

function toChomskyNormalForm(input: Grammar): Grammar {
	const grammar = cloneGrammar(input);
	ensureStartSymbol(grammar);
	eliminateEpsilon(grammar);
	eliminateUnitProductions(grammar);
	replaceTerminalsInLongBodies(grammar);
	binarizeProductions(grammar);
	refreshTerminals(grammar);
	return grammar;
}

function substituteLeadingNonTerminals(grammar: Grammar, maxPasses = 10): void {
	const nonTerminals = grammar.nonTerminals;
	for (let pass = 0; pass < maxPasses; pass += 1) {
		let changed = false;
		const newProductions = new Map<string, Production[]>();
		for (const [head, bodies] of grammar.productions) {
			const updatedBodies: Production[] = [];
			for (const body of bodies) {
				if (body.length === 0) {
					updatedBodies.push([]);
					continue;
				}
				const first = body[0];
				if (!nonTerminals.includes(first)) {
					updatedBodies.push([...body]);
					continue;
				}
				const replacements = grammar.productions.get(first) ?? [];
				for (const replacement of replacements) {
					updatedBodies.push([...replacement, ...body.slice(1)]);
				}
				changed = true;
			}
			newProductions.set(head, updatedBodies);
		}
		grammar.productions = newProductions;
		if (!changed) break;
	}
}

function eliminateImmediateLeftRecursion(grammar: Grammar, head: string): void {
	const bodies = grammar.productions.get(head);
	if (!bodies) return;
	const recursive = bodies.filter((body) => body[0] === head);
	const nonRecursive = bodies.filter((body) => body[0] !== head);
	if (recursive.length === 0) return;

	const used = new Set(grammar.nonTerminals);
	let helper = `${head}_R`;
	let index = 1;
	while (used.has(helper)) {
		helper = `${head}_R${index}`;
		index += 1;
	}
	grammar.nonTerminals.push(helper);

	const updatedBodies = nonRecursive.map((body) => [...body, helper]);
	grammar.productions.set(head, updatedBodies);
	const helperBodies = recursive.map((body) => [...body.slice(1), helper]);
	helperBodies.push([]);
	grammar.productions.set(helper, helperBodies);
}

function toGreibachNormalForm(input: Grammar): Grammar {
	const grammar = cloneGrammar(input);
	ensureStartSymbol(grammar);
	eliminateEpsilon(grammar);
	eliminateUnitProductions(grammar);

	const order = [...grammar.nonTerminals];
	for (let i = 0; i < order.length; i += 1) {
		const head = order[i];
		let bodies = grammar.productions.get(head) ?? [];
		const newBodies: Production[] = [];
		for (const body of bodies) {
			if (body.length === 0) {
				newBodies.push([]);
				continue;
			}
			const first = body[0];
			const j = order.indexOf(first);
			if (j !== -1 && j < i) {
				const replacements = grammar.productions.get(first) ?? [];
				for (const replacement of replacements) {
					newBodies.push([...replacement, ...body.slice(1)]);
				}
			} else {
				newBodies.push([...body]);
			}
		}
		grammar.productions.set(head, newBodies);
		eliminateImmediateLeftRecursion(grammar, head);
		bodies = grammar.productions.get(head) ?? [];
		grammar.productions.set(
			head,
			bodies.filter((body) => body.length > 0 || head === grammar.startSymbol),
		);
	}

	substituteLeadingNonTerminals(grammar, 12);
	eliminateEpsilon(grammar);
	refreshTerminals(grammar);
	return grammar;
}

function escapeTerminal(value: string): string {
	return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function formatGrammar(grammar: Grammar): string {
	const lines: string[] = [];
	for (const head of grammar.nonTerminals) {
		const bodies = grammar.productions.get(head);
		if (!bodies || bodies.length === 0) continue;
		const rhs = bodies
			.map((body) => {
				if (body.length === 0) return "ε";
				return body
					.map((symbol) =>
						grammar.nonTerminals.includes(symbol)
							? symbol
							: `'${escapeTerminal(symbol)}'`,
					)
					.join(" ");
			})
			.join(" | ");
		lines.push(`${head} ::= ${rhs}`);
	}
	return lines.join("\n");
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\#\s]/g, (match) => {
		if (match === "\n") return "\\n";
		if (match === "\r") return "\\r";
		if (match === "\t") return "\\t";
		return `\\${match}`;
	});
}

function buildOnigurumaRegex(grammar: Grammar): string {
	const lines: string[] = [];
	const ntMap = new Map<string, string>();
	grammar.nonTerminals.forEach((nt, i) => {
		ntMap.set(nt, `nt${i}`);
	});

	for (const nt of grammar.nonTerminals) {
		const bodies = grammar.productions.get(nt);
		if (!bodies || bodies.length === 0) continue;
		const rhs = bodies
			.map((body) => {
				if (body.length === 0) return "";
				return body
					.map((symbol) =>
						grammar.nonTerminals.includes(symbol)
							? `\\g<${ntMap.get(symbol)}>`
							: escapeRegex(symbol),
					)
					.join("");
			})
			.join("|");
		lines.push(`  (?<${ntMap.get(nt)}>(?:${rhs}))`);
	}

	return [
		"(?x)",
		"(?(DEFINE)",
		...lines,
		")",
		`\\g<${ntMap.get(grammar.startSymbol)}>`,
	].join("\n");
}

function getGrammarSummary(grammar: Grammar): string {
	const productionCount = [...grammar.productions.values()].reduce(
		(total, bodies) => total + bodies.length,
		0,
	);
	return `${grammar.nonTerminals.length} nonterminals, ${grammar.terminals.length} terminals, ${productionCount} productions`;
}

type MatchSegment = { start: number; end: number; value: string };

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function buildHighlightedHtml(text: string, matches: MatchSegment[]): string {
	if (matches.length === 0) return escapeHtml(text);
	const fragments: string[] = [];
	let cursor = 0;
	for (const match of matches) {
		if (match.start > cursor)
			fragments.push(escapeHtml(text.slice(cursor, match.start)));
		fragments.push(
			`<mark style="border: 1px solid #000">${escapeHtml(text.slice(match.start, match.end))}</mark>`,
		);
		cursor = match.end;
	}
	if (cursor < text.length) fragments.push(escapeHtml(text.slice(cursor)));
	return fragments.join("");
}

const bnfInput = ref(`S ::= 'a' S 'b' | 'ab'`);
const startSymbol = ref("S");
const exampleText = ref("aabb\nab\naab\n");
const maxMatches = ref(200);
const flags = ref("");

const parseResult = computed(() => parseBnf(bnfInput.value, startSymbol.value));
const grammar = computed(() => parseResult.value.grammar);
const parseErrors = computed(() => parseResult.value.errors);
const grammarForOutputs = computed(() =>
	parseErrors.value.length ? null : grammar.value,
);

const grammarSummary = computed(() =>
	grammar.value ? getGrammarSummary(grammar.value) : "No grammar parsed.",
);

const grammarCNF = computed(() => {
	if (!grammarForOutputs.value) return null;
	return toChomskyNormalForm(grammarForOutputs.value);
});

const cnfOutput = computed(() => {
	if (!grammarCNF.value) return "";
	return formatGrammar(grammarCNF.value);
});

const grammarGNF = computed(() => {
	if (!grammarCNF.value) return null;
	return toGreibachNormalForm(grammarCNF.value);
});

const gnfOutput = computed(() => {
	if (!grammarGNF.value) return "";
	return formatGrammar(grammarGNF.value);
});

const onigurumaPattern = computed(() => {
	if (!grammarGNF.value) return "";
	return buildOnigurumaRegex(grammarGNF.value);
});

const matchesResult = ref<{ matches: MatchSegment[]; truncated: boolean }>({
	matches: [],
	truncated: false,
});
const error = ref<string | null>(null);
const isProcessing = ref(false);

watch(
	[onigurumaPattern, flags, exampleText, maxMatches, isWorkerReady],
	async () => {
		if (!isWorkerReady.value || !worker.value) return;
		if (!onigurumaPattern.value.trim()) {
			matchesResult.value = { matches: [], truncated: false };
			error.value = null;
			return;
		}

		isProcessing.value = true;
		try {
			const result = await worker.value.findMatches(
				exampleText.value,
				onigurumaPattern.value,
				flags.value,
				maxMatches.value,
			);
			matchesResult.value = {
				matches: result.matches,
				truncated: result.truncated,
			};
			error.value = result.error || null;
		} catch (e) {
			error.value = String(e);
			matchesResult.value = { matches: [], truncated: false };
		} finally {
			isProcessing.value = false;
		}
	},
	{ immediate: true },
);

const highlightedHtml = computed(() =>
	buildHighlightedHtml(exampleText.value, matchesResult.value.matches),
);

const matchSummary = computed(() => {
	if (!onigurumaPattern.value.trim()) {
		return "Enter grammar to generate a regex";
	}
	if (!isWorkerReady.value) {
		return "Loading Oniguruma WASM...";
	}
	if (error.value) {
		return "Invalid Oniguruma pattern";
	}
	const count = matchesResult.value.matches.length;
	return matchesResult.value.truncated
		? `${count}+ matches (truncated)`
		: `${count} matches`;
});
</script>

<template>
  <div>
    <ToolHeader
      title="Grammar"
      description="Convert BNF grammars into CNF, GNF, and an Oniguruma regex, then preview matches against sample text."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3">
        <div class="col-md-4">
          <label for="start-symbol" class="form-label fw-bold small">Start Symbol</label>
          <input
            id="start-symbol"
            v-model="startSymbol"
            class="form-control font-monospace"
            placeholder="S"
          />
        </div>
        <div class="col-md-4">
          <label for="flags" class="form-label fw-bold small">Regex Flags</label>
          <input
            id="flags"
            v-model="flags"
            class="form-control font-monospace"
            placeholder="i, m, x"
          />
          <div class="form-text">Oniguruma flags apply to the generated pattern.</div>
        </div>
        <div class="col-md-4">
          <label for="limit" class="form-label fw-bold small">Max Matches</label>
          <input
            id="limit"
            v-model.number="maxMatches"
            type="number"
            class="form-control"
            min="1"
            max="5000"
          />
          <div class="form-text">Stops scanning after the limit to keep it fast.</div>
        </div>
        <div class="col-12">
          <div v-if="parseErrors.length" class="alert alert-danger mb-0">
            <div class="fw-bold">BNF parse issues</div>
            <ul class="mb-0 ps-3">
              <li v-for="error in parseErrors" :key="error">{{ error }}</li>
            </ul>
          </div>
          <div v-else class="alert alert-secondary mb-0">
            <strong>Grammar:</strong>
            <span class="font-monospace">{{ grammarSummary }}</span>
          </div>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="BNF Input" class="h-100" no-padding>
          <MonospaceEditor v-model="bnfInput" language="bnf" :rows="16" />
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Example Text" class="h-100">
          <template #header-actions>
            <span class="small text-muted">{{ matchSummary }}</span>
          </template>
          <MonospaceEditor v-model="exampleText" :rows="8" />
          <div class="font-monospace text-finder-output bg-light mt-3">
            <div class="p-3" v-html="highlightedHtml"></div>
          </div>
        </ToolCard>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Chomsky Normal Form" no-padding>
          <template #header-actions>
            <CopyButton :content="cnfOutput" />
          </template>
          <MonospaceEditor :model-value="cnfOutput" language="bnf" bg-light readonly :rows="14" />
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Greibach Normal Form" no-padding>
          <template #header-actions>
            <CopyButton :content="gnfOutput" />
          </template>
          <MonospaceEditor :model-value="gnfOutput" language="bnf" bg-light readonly :rows="14" />
        </ToolCard>
      </div>
      <div class="col-12 mb-4">
        <ToolCard title="Oniguruma Regex" no-padding>
          <template #header-actions>
            <CopyButton :content="onigurumaPattern" />
          </template>
          <MonospaceEditor :model-value="onigurumaPattern" language="regex" bg-light readonly :rows="10" />
          <div v-if="error" class="alert alert-danger m-3 mb-0">
            {{ error }}
          </div>
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-finder-output {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-y: auto;
  border-radius: 0 0 0.375rem 0.375rem;
}
</style>
