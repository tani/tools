import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", redirect: "/replace" },
  // Text & Coding
  {
    path: "/replace",
    component: () => import("./views/replace.vue"),
  },
  {
    path: "/diff",
    component: () => import("./views/diff.vue"),
  },
  {
    path: "/regex-finder",
    component: () => import("./views/regex-finder.vue"),
  },
  {
    path: "/regex-cheat-sheet",
    component: () => import("./views/regex-cheat-sheet.vue"),
  },
  {
    path: "/word-count",
    component: () => import("./views/word-count.vue"),
  },
  {
    path: "/fold-strings",
    component: () => import("./views/fold-strings.vue"),
  },
  // Math & LaTeX
  {
    path: "/unicode-latex",
    component: () => import("./views/unicode-latex.vue"),
  },
  {
    path: "/latex-unicode",
    component: () => import("./views/latex-unicode.vue"),
  },
  {
    path: "/math-preview",
    component: () => import("./views/math-preview.vue"),
  },
  {
    path: "/statistics",
    component: () => import("./views/statistics.vue"),
  },
  // Graphics & Images
  {
    path: "/image-resize",
    component: () => import("./views/image-resize.vue"),
  },
  {
    path: "/ocr",
    component: () => import("./views/ocr.vue"),
  },
  {
    path: "/svg-png",
    component: () => import("./views/svg-png.vue"),
  },
  {
    path: "/mermaid",
    component: () => import("./views/mermaid.vue"),
  },
  {
    path: "/bg-remover",
    component: () => import("./views/bg-remover.vue"),
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
    path: "/pdf-resize",
    component: () => import("./views/pdf-resize.vue"),
  },
  {
    path: "/pdf-sort",
    component: () => import("./views/pdf-sort.vue"),
  },
  {
    path: "/pdf-text",
    component: () => import("./views/pdf-text.vue"),
  },
  // Utilities
  {
    path: "/pomodoro",
    component: () => import("./views/pomodoro.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
