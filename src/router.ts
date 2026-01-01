import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", redirect: "/unicode-to-latex" },
  {
    path: "/unicode-to-latex",
    component: () => import("./views/unicode-to-latex.vue"),
  },
  {
    path: "/latex-to-unicode",
    component: () => import("./views/latex-to-unicode.vue"),
  },
  {
    path: "/replace-text",
    component: () => import("./views/replace-text.vue"),
  },
  {
    path: "/find-differences",
    component: () => import("./views/find-differences.vue"),
  },
  {
    path: "/svg-to-png",
    component: () => import("./views/svg-to-png.vue"),
  },
  {
    path: "/word-count",
    component: () => import("./views/word-count.vue"),
  },
  {
    path: "/basic-statistics",
    component: () => import("./views/basic-statistics.vue"),
  },
  {
    path: "/mermaid-editor",
    component: () => import("./views/mermaid-editor.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
