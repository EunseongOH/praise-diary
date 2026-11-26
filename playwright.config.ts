import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',workers:1,reporter:'line',use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium',reducedMotion:'reduce'},webServer:{command:'npm run preview -- --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI,timeout:30000}});
