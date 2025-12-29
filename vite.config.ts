import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/' : '/foxhole-reporter/', // Use '/foxhole-reporter/' for GitHub Pages base, '/' for custom domain
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  server: {
    port: 5173
  }
}));
