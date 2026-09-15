import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), react()],
    define: {
      'process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID': JSON.stringify(
        process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || ''
      ),
      'process.env.NEXT_PUBLIC_PAYPAL_ENV': JSON.stringify(
        process.env.NEXT_PUBLIC_PAYPAL_ENV || (process.env.PAYPAL_MODE === 'live' ? 'live' : '') || ''
      ),
      'process.env.PAYPAL_MODE': JSON.stringify(
        process.env.PAYPAL_MODE || (process.env.NEXT_PUBLIC_PAYPAL_ENV === 'live' ? 'live' : 'sandbox')
      ),
    },
    resolve: {
      alias: {
        '@/components': path.resolve(__dirname, 'src/components'),
        '@/lib': path.resolve(__dirname, 'src/lib'),
        '@/src': path.resolve(__dirname, 'src'),
        '@': path.resolve(__dirname, '.'),
        '@/components/layout': path.resolve(__dirname, 'src/components/Layout'),
        '@/src/components/layout': path.resolve(__dirname, 'src/components/Layout'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2500,
      sourcemap: false,
      minify: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('firestoreErrorHandler')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('@paypal')) return 'vendor-paypal';
              if (id.includes('react-router')) return 'vendor-router';
              if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
            }
          },
        },
      },
    },
  };
});
