import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    // happy-dom 提供 DOM API，让 Vue Test Utils 能 mount .vue SFC 组件。
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
});
