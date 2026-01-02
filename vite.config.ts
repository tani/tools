import { defineConfig } from "vite";
import vue from "unplugin-vue/vite";

import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "node:fs": fileURLToPath(new URL("./src/utils/empty.ts", import.meta.url)),
      "fs": fileURLToPath(new URL("./src/utils/empty.ts", import.meta.url)),
      "path": fileURLToPath(new URL("./src/utils/empty.ts", import.meta.url)),
      "crypto": fileURLToPath(new URL("./src/utils/empty.ts", import.meta.url)),
      module: fileURLToPath(new URL("./src/utils/empty.ts", import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ["mupdf"],
  },
});
