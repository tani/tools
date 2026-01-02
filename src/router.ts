import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", redirect: "/replace-text" },
  // Text & Coding
  {
    path: "/replace-text",
    component: () => import("./views/replace-text.vue"),
  },
  {
    path: "/find-differences",
    component: () => import("./views/find-differences.vue"),
  },
  {
    path: "/word-count",
    component: () => import("./views/word-count.vue"),
  },
  {
    path: "/string-folding",
    component: () => import("./views/string-folding.vue"),
  },
  // Math & LaTeX
  {
    path: "/unicode-to-latex",
    component: () => import("./views/unicode-to-latex.vue"),
  },
  {
    path: "/latex-to-unicode",
    component: () => import("./views/latex-to-unicode.vue"),
  },
  {
    path: "/math-preview",
    component: () => import("./views/math-preview.vue"),
  },
  {
    path: "/basic-statistics",
    component: () => import("./views/basic-statistics.vue"),
  },
  // Graphics & Images
  {
    path: "/image-tools",
    component: () => import("./views/image-tools.vue"),
  },
  {
    path: "/ocr-tool",
    component: () => import("./views/ocr-reader.vue"),
  },
  {
    path: "/svg-to-png",
    component: () => import("./views/svg-to-png.vue"),
  },
  {
    path: "/mermaid-editor",
    component: () => import("./views/mermaid-editor.vue"),
  },
  // PDF Tools
  {
    path: "/pdf-viewer",
    component: () => import("./views/pdf-viewer.vue"),
  },
  {
    path: "/pdf-merge",
    component: () => import("./views/pdf-merge.vue"),
  },
  {
    path: "/pdf-extract",
    component: () => import("./views/pdf-extract.vue"),
  },
  {
    path: "/pdf-resizer",
    component: () => import("./views/pdf-resizer.vue"),
  },
  {
    path: "/pdf-sorter",
    component: () => import("./views/pdf-sorter.vue"),
  },
  {
    path: "/pdf-to-text",
    component: () => import("./views/pdf-to-text.vue"),
  },
  // Utilities
  {
    path: "/pomodoro-timer",
    component: () => import("./views/pomodoro-timer.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
