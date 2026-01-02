import { EmulatedRegExp, toRegExpDetails, type ToRegExpOptions } from "oniguruma-to-es";

export type OnigurumaTarget = "auto" | "ES2018" | "ES2024" | "ES2025";

export type CompileResult = {
  compiled: CompiledOniguruma | null;
  error: string | null;
};

export type CompiledOniguruma = ReturnType<typeof toRegExpDetails>;

export type MatchSegment = {
  start: number;
  end: number;
  value: string;
};

export type MatchResult = {
  matches: MatchSegment[];
  truncated: boolean;
};

export function compileOnigurumaRegex(
  pattern: string,
  options: { flags?: string; target?: OnigurumaTarget } = {},
): CompileResult {
  if (pattern.trim() === "") {
    return { compiled: null, error: null };
  }

  const rawFlags = options.flags?.replace(/\s+/g, "").trim();
  const toRegExpOptions: ToRegExpOptions = {
    global: true,
    target: options.target ?? "auto",
  };

  if (rawFlags) {
    toRegExpOptions.flags = rawFlags;
  }

  try {
    const details = toRegExpDetails(pattern, toRegExpOptions);
    return { compiled: details, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { compiled: null, error: message };
  }
}

export function createOnigurumaRegExp(compiled: CompiledOniguruma): RegExp {
  if (compiled.options) {
    return new EmulatedRegExp(compiled.pattern, compiled.flags, compiled.options);
  }
  return new RegExp(compiled.pattern, compiled.flags);
}

export function findMatches(
  text: string,
  compiled: CompiledOniguruma,
  maxMatches: number,
): MatchResult {
  const safeLimit = Number.isFinite(maxMatches) ? Math.max(0, Math.floor(maxMatches)) : 0;
  if (safeLimit === 0) {
    return { matches: [], truncated: false };
  }

  const regex = createOnigurumaRegExp(compiled);
  const matches: MatchSegment[] = [];
  let truncated = false;

  let match: RegExpExecArray | null = regex.exec(text);

  while (match) {
    const start = match.index;
    const end = start + match[0].length;
    matches.push({ start, end, value: match[0] });

    if (match[0].length === 0) {
      regex.lastIndex = start + 1;
    }

    if (matches.length >= safeLimit) {
      truncated = true;
      break;
    }

    match = regex.exec(text);
  }

  return { matches, truncated };
}

export function replaceMatches(
  text: string,
  compiled: CompiledOniguruma,
  replacement: string,
): string {
  const regex = createOnigurumaRegExp(compiled);
  return text.replace(regex, replacement);
}

export function buildHighlightedHtml(text: string, matches: MatchSegment[]): string {
  if (matches.length === 0) {
    return escapeHtml(text);
  }

  const fragments: string[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      fragments.push(escapeHtml(text.slice(cursor, match.start)));
    }

    const matchText = text.slice(match.start, match.end);
    fragments.push(`<mark class="text-finder-highlight">${escapeHtml(matchText)}</mark>`);
    cursor = match.end;
  }

  if (cursor < text.length) {
    fragments.push(escapeHtml(text.slice(cursor)));
  }

  return fragments.join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
