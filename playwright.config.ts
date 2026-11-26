import { defineConfig } from '@playwright/test';
// app       = the existing screens on the default build (snowflake flag OFF, production default)
// snowflake = December snowflake review build (VITE_SNOWFLAKE_ARTWORK=1, VITE_SNOWFLAKE_COMPLETION_REPLAY=1, demo date 2026-12-20)
export default defineConfig({testDir:'./tests/e2e',workers:1,reporter:'line',use:{browserName:'chromium',reducedMotion:'reduce'},
 projects:[
  {name:'app',testIgnore:/snowflake-.*\.spec\.ts/,use:{baseURL:'http://127.0.0.1:4173'}},
  {name:'snowflake',testMatch:/snowflake-.*\.spec\.ts/,use:{baseURL:'http://127.0.0.1:4175',reducedMotion:'no-preference'}},
 ],
 webServer:[
  {command:'npm run preview -- --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI,timeout:30000},
  {command:'node scripts/snowflake-review.mjs build && node scripts/snowflake-review.mjs preview',url:'http://127.0.0.1:4175',reuseExistingServer:!process.env.CI,timeout:180000},
 ]});
