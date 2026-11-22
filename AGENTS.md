# GEMINI Context: Taniguchi's Tools

## Project Overview

This project, "Taniguchi's Tools," is a comprehensive, web-based suite of developer and utility tools. It is built as a Single Page Application (SPA) providing a variety of functionalities ranging from text manipulation and mathematical conversions to graphics processing.

### Main Technologies

- **Framework:** Vue 3 (Composition API with `<script setup>`)
- **Language:** TypeScript
- **Runtime and Package Manager:** Node.js 24 and npm
- **Build Tool:** Vite+ with `@vitejs/plugin-vue`
- **Styling:** Bootstrap 5 with Bootswatch "Lumen" theme
- **Routing:** Vue Router
- **Linting/Formatting:** Oxlint and Oxfmt via Vite+

### Architecture

- **`src/tools.ts`**: **[CRITICAL]** The single source of truth for tool definitions. Contains path, component import, metadata, and category for every tool.
- **`src/views/`**: Contains the individual tool components (e.g., `pattern.vue`, `regex.vue`). New tools must be registered in `src/tools.ts`.
- **`src/workers/`** contains Web Worker code.
- **`unplugin/`** contains build plugins for the PWA, Tesseract assets, and browser polyfills.

## Building and Running

### Build

```bash
npm ci
npm run dev
npm run build
```

The production build writes the application to `dist/`.

### Code Quality

- Run `npm run check` to check formatting, lint rules, and Vue and TypeScript types.
- Run `npm run check!` to apply formatting and safe lint fixes.
- Run `npm test` to run the PDFium suite.

## Development Conventions

### adding a New Tool

1.  **Create Component:** Create your tool component in `src/views/`.
2.  **Register:** Add the tool entry to the `tools` array in `src/tools.ts`.
    - **Note:** Do NOT manually modify `src/router.ts`, `src/App.vue`, or `src/views/home.vue` to add links. These are automatically generated from `src/tools.ts`.

### UI/UX Design Pattern (The "Window-Bar" Style)

All tools must adhere to the established consistent design language:

1.  **Header:** Every tool starts with `ToolHeader` component.
2.  **Configuration:** Settings/Inputs are placed in a `ToolCard` (or simple card) with a header `fw-bold small text-uppercase text-muted`.
3.  **Split Layout:** Main workspaces should use a 2-column grid (`col-lg-6`) on large screens.
4.  **Cards:** All textareas and preview areas are wrapped in cards.
5.  **Typography:** Monospaced fonts (`font-monospace`) are used for all code, data, and technical text areas.
6.  **Read-Only Areas:** Output areas use the `bg-light` background class.

### Coding Practices

- **Language:** The user interface and all documentation/comments must be in **English**.
- **Reactivity:** Leverage Vue's `computed` properties for real-time data processing to ensure a responsive "instant-feedback" feel.
- **Verification** requires running `npm run check` and `npm run build` before finishing a task.
