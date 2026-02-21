#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const isoPath = path.resolve(process.cwd(), "iso3166.json");
const svgPath = path.resolve(process.cwd(), "worldmap.svg");
const outputPath = path.resolve(process.cwd(), "worldmap.with-iso3166.svg");

const isoMap = JSON.parse(fs.readFileSync(isoPath, "utf8"));
const svg = fs.readFileSync(svgPath, "utf8");

const aliases = new Map(
	Object.entries({
		"bosnia and herzegovina": "BA",
		"czech republic": "CZ",
		"congo kinshasa": "CD",
		"democratic republic of the congo": "CD",
		"dr congo": "CD",
		"congo brazzaville": "CG",
		"republic of congo": "CG",
		"ivory coast": "CI",
		"cote divoire": "CI",
		"united states": "US",
		"united states of america": "US",
		"south korea": "KR",
		"north korea": "KP",
		"russian federation": "RU",
		"lao pdr": "LA",
		myanmar: "MM",
		eswatini: "SZ",
		"cape verde": "CV",
		"viet nam": "VN",
		macedonia: "MK",
		"east timor": "TL",
	}),
);

function normalizeName(value) {
	return value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/\p{M}/gu, "")
		.replace(/&/g, " and ")
		.replace(/[()]/g, " ")
		.replace(/[^\p{L}\p{N}\s-]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function tokenize(value) {
	return normalizeName(value)
		.split(" ")
		.filter(Boolean)
		.filter((token) => !["the", "of", "and"].includes(token));
}

function levenshtein(a, b) {
	const rows = a.length + 1;
	const cols = b.length + 1;
	const dp = Array.from({ length: rows }, (_, i) => {
		const row = new Array(cols).fill(0);
		row[0] = i;
		return row;
	});
	for (let j = 0; j < cols; j += 1) {
		dp[0][j] = j;
	}
	for (let i = 1; i < rows; i += 1) {
		for (let j = 1; j < cols; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(
				dp[i - 1][j] + 1,
				dp[i][j - 1] + 1,
				dp[i - 1][j - 1] + cost,
			);
		}
	}
	return dp[a.length][b.length];
}

function similarity(a, b) {
	const na = normalizeName(a);
	const nb = normalizeName(b);
	if (!na || !nb) {
		return 0;
	}
	if (na === nb) {
		return 1;
	}

	const dist = levenshtein(na, nb);
	const levSim = 1 - dist / Math.max(na.length, nb.length);

	const ta = new Set(tokenize(na));
	const tb = new Set(tokenize(nb));
	const intersect = [...ta].filter((t) => tb.has(t)).length;
	const union = new Set([...ta, ...tb]).size || 1;
	const tokenJaccard = intersect / union;

	const containment = na.includes(nb) || nb.includes(na) ? 1 : 0;
	return levSim * 0.55 + tokenJaccard * 0.35 + containment * 0.1;
}

function parseAttributes(tag) {
	const attrs = {};
	const attrRegex = /([:\w-]+)\s*=\s*"([^"]*)"/g;
	for (const match of tag.matchAll(attrRegex)) {
		attrs[match[1]] = match[2];
	}
	return attrs;
}

function setAttribute(tag, key, value) {
	const attrPattern = new RegExp(`\\s${key}="[^"]*"`);
	if (attrPattern.test(tag)) {
		return tag.replace(attrPattern, ` ${key}="${value}"`);
	}
	return tag.replace(/>$/, ` ${key}="${value}">`);
}

const normalizedIsoEntries = Object.entries(isoMap).map(([name, code]) => ({
	name,
	code,
	normalized: normalizeName(name),
}));
const normalizedNameToCode = new Map(
	normalizedIsoEntries.map(({ normalized, code }) => [normalized, code]),
);
const isoCodeSet = new Set(Object.values(isoMap));

function findBestIsoCode(candidates) {
	for (const raw of candidates) {
		if (!raw) {
			continue;
		}
		const candidate = raw.trim();
		if (!candidate) {
			continue;
		}

		if (/^[A-Z]{2}$/.test(candidate) && isoCodeSet.has(candidate)) {
			return { code: candidate, score: 1, source: candidate };
		}

		const normalized = normalizeName(candidate);
		const alias = aliases.get(normalized);
		if (alias) {
			return { code: alias, score: 0.99, source: candidate };
		}

		const exact = normalizedNameToCode.get(normalized);
		if (exact) {
			return { code: exact, score: 1, source: candidate };
		}

		let best = null;
		for (const entry of normalizedIsoEntries) {
			const score = similarity(normalized, entry.normalized);
			if (!best || score > best.score) {
				best = {
					code: entry.code,
					score,
					source: candidate,
					matched: entry.name,
				};
			}
		}
		if (best && best.score >= 0.72) {
			return best;
		}
	}
	return null;
}

let matched = 0;
let unmatched = 0;
const unmatchedNames = new Set();
const fuzzyLogs = [];

const rewritten = svg.replace(/<path\b[^>]*>/g, (tag) => {
	const attrs = parseAttributes(tag);
	const className = attrs.class || "";
	const classCandidates = className
		? [className, ...className.split(/\s+/).filter(Boolean)]
		: [];

	const candidates = [attrs.name || "", ...classCandidates, attrs.id || ""];

	const best = findBestIsoCode(candidates);
	if (!best) {
		unmatched += 1;
		if (attrs.name || attrs.class || attrs.id) {
			unmatchedNames.add(attrs.name || attrs.class || attrs.id);
		}
		return tag;
	}

	matched += 1;
	if (best.score < 0.999) {
		fuzzyLogs.push(
			`${best.source} -> ${best.code} (${best.matched || "alias"}, score=${best.score.toFixed(3)})`,
		);
	}
	return setAttribute(tag, "id", best.code);
});

fs.writeFileSync(outputPath, rewritten);

console.log(`Wrote ${path.basename(outputPath)}`);
console.log(`Matched paths: ${matched}`);
console.log(`Unmatched paths: ${unmatched}`);
if (fuzzyLogs.length > 0) {
	console.log("");
	console.log("Fuzzy assignments:");
	for (const line of fuzzyLogs.slice(0, 50)) {
		console.log(`- ${line}`);
	}
	if (fuzzyLogs.length > 50) {
		console.log(`... and ${fuzzyLogs.length - 50} more`);
	}
}
if (unmatchedNames.size > 0) {
	console.log("");
	console.log("Unmatched labels:");
	for (const name of [...unmatchedNames].slice(0, 50)) {
		console.log(`- ${name}`);
	}
	if (unmatchedNames.size > 50) {
		console.log(`... and ${unmatchedNames.size - 50} more`);
	}
}
