import { createApp } from "vue";
import App from "./App.vue";
import { i18n, detectInitialLocale, setLocale } from "./i18n";

const app = createApp(App);
app.use(i18n);
setLocale(detectInitialLocale());
app.mount("#app");
