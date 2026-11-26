import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Snowflake review flag OFF (production default): the lazy snowflake module resolves to an empty stub, so neither the
  // engine nor its worker is emitted into the build. ON (review builds): the real module and its worker are bundled.
  const snowflake = loadEnv(mode, '.', 'VITE_').VITE_SNOWFLAKE_ARTWORK === '1';
  return {
    plugins: [react()],
    server: { host: '0.0.0.0' },
    resolve: { alias: snowflake ? [] : [{ find: /^\.\/snowflake\/SnowflakeArtwork$/, replacement: '/src/graphics/snowflake/disabled.ts' }] },
  };
});
