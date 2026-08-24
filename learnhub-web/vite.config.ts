import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { parseRuntimeConfig } from './src/config/runtimeConfig.shared.ts';

export default defineConfig(({ mode }) => {
  parseRuntimeConfig(loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react()],
    resolve: {
      alias: [
        // LearnHub only needs core HLS playback; keep full package types while shipping its light runtime.
        { find: /^hls\.js$/, replacement: 'hls.js/light' },
      ],
    },
    server: {
      port: 3000,
      strictPort: true,
    },
    preview: {
      port: 3000,
      strictPort: true,
    },
  };
});
