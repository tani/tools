# GEMINI Context: Taniguchi's Tools

## Project Overview

This project, "Taniguchi's Tools," is a comprehensive, web-based suite of developer and utility tools. It is built as a Single Page Application (SPA) providing a variety of functionalities ranging from text manipulation and mathematical conversions to graphics processing.

### Main Technologies

- **Framework:** Vue 3 (Composition API with `<script setup>`)
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Bootstrap 5 with Bootswatch "Lumen" theme
- **Routing:** Vue Router
- **Testing:** Node.js native test runner (`node:test`) executed via `tsx`
- **Linting/Formatting:** Oxlint and Oxfmt

### Architecture

- **`src/views/`**: Contains the individual tool components (e.g., `string-folding.vue`, `basic-statistics.vue`).
- **`src/utils/`**: Houses shared logic and pure functions (e.g., `statistics.ts`) to ensure testability and reusability.
- **`src/assets/`**: Static data files like JSON mappings for LaTeX/Unicode conversions.
- **`src/App.vue`**: The main layout containing the categorized sidebar navigation.

## Building and Running

### Development

```bash
npm run dev
```

Starts the Vite development server.

### Build

```bash
npm run build
```

Compiles the application for production into the `dist/` directory.

### Testing

```bash
npm test
```

Runs unit tests for utility logic using the Node.js test runner and `tsx`.

### Code Quality

- **Type Checking:** `npm run check` (runs `tsc` and `vue-tsc`)
- **Linting:** `npm run lint` (runs `oxlint`)
- **Formatting:** `npm run format` (runs `oxfmt`)

## Development Conventions

### UI/UX Design Pattern (The "Window-Bar" Style)

All tools must adhere to the established consistent design language:

1.  **Header:** Every tool starts with an `h2.display-6` title followed by a `p.text-muted` description.
2.  **Configuration:** Settings/Inputs are placed in a `card mb-4 shadow-sm` with a `card-header` in `fw-bold small text-uppercase text-muted`.
3.  **Split Layout:** Main workspaces should use a 2-column grid (`col-lg-6`) on large screens.
4.  **Cards:** All textareas and preview areas are wrapped in cards. Headers should contain tool-specific actions (e.g., "Copy", "Download PNG") as text links on the right.
5.  **Typography:** Monospaced fonts (`font-monospace`) are used for all code, data, and technical text areas.
6.  **Read-Only Areas:** Output areas use the `bg-light` background class to distinguish them from editable inputs.

### Coding Practices

- **Logic Extraction:** Complex calculation logic should be extracted from `.vue` files into `src/utils/*.ts` and accompanied by a corresponding `*.test.ts` file.
- **Language:** The user interface and all documentation/comments must be in **English**.
- **Reactivity:** Leverage Vue's `computed` properties for real-time data processing to ensure a responsive "instant-feedback" feel.
- **Safety:** Always run `npm run check` before committing UI or logic changes.
