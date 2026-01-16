import { Buffer } from "node:buffer";
import process from "node:process";
import Prism from "prismjs";
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "bootswatch/dist/lumen/bootstrap.min.css";
import "bootstrap/js/dist/collapse";
import { registerSW } from "virtual:pwa-register";

globalThis.Buffer = Buffer;
globalThis.process = process;
globalThis.Prism = Prism;

registerSW({ immediate: true });

createApp(App).use(router).mount("#app");
