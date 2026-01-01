import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "bootswatch/dist/lumen/bootstrap.min.css";
import "@git-diff-view/vue/styles/diff-view.css";

createApp(App).use(router).mount("#app");
