import path from "path"
import react from "@vitejs/plugin-react"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Cloudflare serves this build from the Worker root and rewrites SPA routes.
  // Root-relative chunks keep direct visits such as /pricing from requesting /pricing/assets/....
  base: '/',
  plugins: [
    react(),
    ...(mode === 'analyze'
      ? [visualizer({ filename: 'build/bundle-report.html', gzipSize: true, brotliSize: true })]
      : []),
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'build',
    assetsDir: '.',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router') || id.includes('@tanstack/react-query')) {
            return 'react-vendor';
          }
          if (id.includes('@radix-ui')) return 'radix-vendor';
          return undefined;
        },
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
