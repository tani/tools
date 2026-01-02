import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildHighlightedHtml,
  compileOnigurumaRegex,
  findMatches,
  createOnigurumaRegExp,
} from "./text-finder";

test("compileOnigurumaRegex returns a global regex", () => {
  const result = compileOnigurumaRegex("\\d+", { flags: "", target: "ES2018" });
  assert.ok(result.compiled);
  assert.equal(result.error, null);
  const regex = createOnigurumaRegExp(result.compiled!);
  assert.ok(regex.global);
});

test("findMatches collects multiple matches", () => {
  const result = compileOnigurumaRegex("\\d+", { target: "ES2018" });
  assert.ok(result.compiled);
  const matches = findMatches("a1b22c333", result.compiled!, 10);
  assert.equal(matches.matches.length, 3);
  assert.deepEqual(
    matches.matches.map((match) => match.value),
    ["1", "22", "333"],
  );
});

test("findMatches handles zero-length matches without looping", () => {
  const result = compileOnigurumaRegex("(?=a)", { target: "ES2018" });
  assert.ok(result.compiled);
  const matches = findMatches("aa", result.compiled!, 10);
  assert.equal(matches.matches.length, 2);
  assert.deepEqual(
    matches.matches.map((match) => match.value),
    ["", ""],
  );
});

test("buildHighlightedHtml escapes HTML and wraps matches", () => {
  const result = compileOnigurumaRegex("\\d", { target: "ES2018" });
  assert.ok(result.compiled);
  const matches = findMatches("<a>1</a>", result.compiled!, 10);
  const html = buildHighlightedHtml("<a>1</a>", matches.matches);
  assert.equal(html, '&lt;a&gt;<mark class="text-finder-highlight">1</mark>&lt;/a&gt;');
});
