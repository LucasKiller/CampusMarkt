import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
  },
  webServer: {
    command:
      "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
    cwd: import.meta.dirname,
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:3100",
  },
});
