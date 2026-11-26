// Snowflake review build / preview / dev with the review flags ON (no .env file is written or committed).
//   node scripts/snowflake-review.mjs dev      → http://localhost:5173  (?snowflakeDays=14 for the 14 → 15 replay)
//   node scripts/snowflake-review.mjs build    → dist-snowflake/
//   node scripts/snowflake-review.mjs preview  → http://127.0.0.1:4175 (serves dist-snowflake/)
import { spawn } from 'node:child_process';
const mode = process.argv[2] ?? 'dev';
const env = { ...process.env, VITE_SNOWFLAKE_ARTWORK: '1', VITE_SNOWFLAKE_COMPLETION_REPLAY: '1', VITE_DEMO_DATE: process.env.VITE_DEMO_DATE ?? '2026-12-20T18:00:00+09:00' };
const args = mode === 'build' ? ['vite', 'build', '--outDir', 'dist-snowflake'] : mode === 'preview' ? ['vite', 'preview', '--outDir', 'dist-snowflake', '--host', '127.0.0.1', '--port', '4175', '--strictPort'] : ['vite', '--host', '0.0.0.0'];
const child = spawn('npx', args, { env, stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', code => process.exit(code ?? 0));
