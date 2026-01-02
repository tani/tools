<script setup lang="ts">
const sections = [
  {
    title: "Core Tokens",
    rows: [
      { syntax: ".", meaning: "Any character except newline (Oniguruma default)." },
      { syntax: "\\O", meaning: "Any character (including newline)." },
      { syntax: "\\N", meaning: "Any character except newline (explicit)." },
      { syntax: "\\R", meaning: "Any newline sequence (\n, \r\n, etc.)." },
      { syntax: "\\X", meaning: "Extended grapheme cluster (approximate)." },
      { syntax: "^", meaning: "Start of line (unless singleline option)." },
      { syntax: "$", meaning: "End of line (unless singleline option)." },
      { syntax: "\\A", meaning: "Start of string." },
      { syntax: "\\Z", meaning: "End of string or before final newline." },
      { syntax: "\\z", meaning: "End of string." },
      { syntax: "\\G", meaning: "Continue from previous match end." },
    ],
  },
  {
    title: "Character Classes",
    rows: [
      { syntax: "[abc]", meaning: "Any of a, b, or c." },
      { syntax: "[^abc]", meaning: "Not a, b, or c." },
      { syntax: "[a-z]", meaning: "Range a through z." },
      { syntax: "[[:digit:]]", meaning: "POSIX class (digit)." },
      { syntax: "[[:alpha:]]", meaning: "POSIX class (letter)." },
      { syntax: "[[:alnum:]]", meaning: "POSIX class (letter or digit)." },
      { syntax: "[[:space:]]", meaning: "POSIX class (whitespace)." },
      { syntax: "[a-z&&[^aeiou]]", meaning: "Class intersection (consonants)." },
      { syntax: "\\d / \\D", meaning: "Digit / non-digit (Unicode by default)." },
      { syntax: "\\w / \\W", meaning: "Word / non-word (Unicode by default)." },
      { syntax: "\\s / \\S", meaning: "Whitespace / non-whitespace (Unicode)." },
      { syntax: "\\h / \\H", meaning: "Hex digit / non-hex digit." },
      { syntax: "\\p{L}", meaning: "Unicode property (letters)." },
      { syntax: "\\p{Script=Greek}", meaning: "Unicode script property." },
      { syntax: "\\P{...}", meaning: "Negated Unicode property." },
    ],
  },
  {
    title: "Quantifiers",
    rows: [
      { syntax: "*", meaning: "0 or more (greedy)." },
      { syntax: "+", meaning: "1 or more (greedy)." },
      { syntax: "?", meaning: "0 or 1 (greedy)." },
      { syntax: "{n}", meaning: "Exactly n." },
      { syntax: "{n,}", meaning: "At least n." },
      { syntax: "{n,m}", meaning: "Between n and m." },
      { syntax: "*? +? ?? {n,m}?", meaning: "Lazy (non-greedy) variants." },
      { syntax: "*+ ++ ?+ {n,m}+", meaning: "Possessive variants (where supported)." },
      { syntax: "(?>...)", meaning: "Atomic group (no backtracking)." },
    ],
  },
  {
    title: "Groups & Alternation",
    rows: [
      { syntax: "(...) ", meaning: "Capturing group." },
      { syntax: "(?:...)", meaning: "Non-capturing group." },
      { syntax: "(?<name>...)", meaning: "Named capture (preferred)." },
      { syntax: "(?'name'...)", meaning: "Named capture (alternate)." },
      { syntax: "...|...", meaning: "Alternation." },
      { syntax: "(?=...)", meaning: "Positive lookahead." },
      { syntax: "(?!...)", meaning: "Negative lookahead." },
      { syntax: "(?<=...)", meaning: "Positive lookbehind." },
      { syntax: "(?<!...)", meaning: "Negative lookbehind." },
    ],
  },
  {
    title: "Backreferences & Subroutines",
    rows: [
      { syntax: "\\1", meaning: "Numeric backreference." },
      { syntax: "\\k<name>", meaning: "Named backreference." },
      { syntax: "\\k<1>", meaning: "Numbered backreference (explicit)." },
      { syntax: "\\g<name>", meaning: "Named subroutine call." },
      { syntax: "\\g<1>", meaning: "Numbered subroutine call." },
      { syntax: "\\g<0>", meaning: "Recursion (entire pattern)." },
    ],
  },
  {
    title: "Flags & Modifiers",
    rows: [
      { syntax: "i", meaning: "Ignore case (Unicode-aware)." },
      { syntax: "m", meaning: "Dot matches newline (equivalent to JS s)." },
      { syntax: "x", meaning: "Extended mode (ignore whitespace/comments)." },
      { syntax: "D", meaning: "ASCII digit classes." },
      { syntax: "S", meaning: "ASCII space classes." },
      { syntax: "W", meaning: "ASCII word classes." },
      { syntax: "y{g}", meaning: "Grapheme text segment mode." },
      { syntax: "(?imx-imx:...)", meaning: "Scoped flag group." },
      { syntax: "(?imx-imx)", meaning: "Inline flags (from this point)." },
    ],
  },
  {
    title: "Anchors & Boundaries",
    rows: [
      { syntax: "\\b / \\B", meaning: "Word boundary / non-boundary." },
      { syntax: "\\y / \\Y", meaning: "Text segment boundaries (often unsupported)." },
      { syntax: "\\A, \\Z, \\z", meaning: "String boundaries." },
      { syntax: "\\G", meaning: "End of previous match (global scanning)." },
    ],
  },
  {
    title: "Special Constructs",
    rows: [
      { syntax: "(?# comment)", meaning: "Inline comment group." },
      { syntax: "\\K", meaning: "Keep: resets match start (top-level only)." },
      { syntax: "(*FAIL)", meaning: "Force a match failure." },
      { syntax: "(?~...)", meaning: "Absence operator (rare)." },
    ],
  },
];

const examples = [
  {
    title: "Hex words (extended mode)",
    pattern: String.raw`(?x)
      \b
      [0-9A-Fa-f]+
      \b
    `,
    desc: "Ignore whitespace/comments while matching hex words.",
  },
  {
    title: "Unicode letters", 
    pattern: String.raw`\p{L}+`,
    desc: "Matches letters in any script.",
  },
  {
    title: "Named capture + backreference",
    pattern: String.raw`(?<word>\w+)\s+\k<word>`,
    desc: "Finds repeated words like 'hello hello'.",
  },
  {
    title: "Atomic group", 
    pattern: String.raw`(?>\d{2})\d`,
    desc: "Prevents backtracking into the first two digits.",
  },
];

const caveats = [
  "Oniguruma's flag 'm' means dot-all, unlike JavaScript's multiline.",
  "Unicode is default for \d, \w, \s unless you enable ASCII flags (D/S/W).",
  "Some advanced features depend on target support when transpiled to JavaScript.",
  "Using oniguruma-to-es, patterns may be emulated with a RegExp subclass.",
];
</script>

<template>
  <div>
    <h2 class="display-6">Regex Cheat Sheet</h2>
    <p class="text-muted mb-4">
      A practical reference of Oniguruma syntax, flags, and key differences when using
      oniguruma-to-es in the browser.
    </p>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Quick Start</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-lg-6">
            <div class="p-3 bg-light rounded">
              <div class="fw-bold small text-uppercase text-muted mb-2">Pattern + Flags</div>
              <div class="font-monospace">\b\h+\b</div>
              <div class="font-monospace">flags: i</div>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="p-3 bg-light rounded">
              <div class="fw-bold small text-uppercase text-muted mb-2">Inline Modifiers</div>
              <div class="font-monospace">(?x)  # ignore whitespace</div>
              <div class="font-monospace">(?i:...)</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div v-for="section in sections" :key="section.title" class="col-12 mb-4">
        <div class="card shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">{{ section.title }}</div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="text-uppercase small text-muted" style="width: 35%">Syntax</th>
                    <th class="text-uppercase small text-muted">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in section.rows" :key="row.syntax">
                    <td class="font-monospace">{{ row.syntax }}</td>
                    <td>{{ row.meaning }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Common Examples</div>
          <div class="card-body">
            <div v-for="example in examples" :key="example.title" class="mb-3">
              <div class="fw-bold">{{ example.title }}</div>
              <div class="font-monospace bg-light p-2 rounded mb-1">
                {{ example.pattern }}
              </div>
              <div class="text-muted small">{{ example.desc }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold small text-uppercase text-muted">Notes & Caveats</div>
          <div class="card-body">
            <ul class="mb-0">
              <li v-for="note in caveats" :key="note">{{ note }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Useful Links</div>
      <div class="card-body">
        <div class="d-flex flex-column gap-2">
          <a
            href="https://github.com/kkos/oniguruma/blob/master/doc/RE"
            target="_blank"
            rel="noreferrer"
          >
            Official Oniguruma Syntax Reference
          </a>
          <a
            href="https://github.com/slevithan/oniguruma-to-es"
            target="_blank"
            rel="noreferrer"
          >
            oniguruma-to-es documentation
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table td,
.table th {
  vertical-align: middle;
}
</style>
