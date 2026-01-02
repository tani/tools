import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import vue from "unplugin-vue/vite";

export default defineConfig({
  plugins: [vue(), nodePolyfills()],
  optimizeDeps: {
    exclude: ["mupdf"],
  },
});
