import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
  plugins: [
    webExtension({
      manifest: './src/manifest.json',
      watchFilePaths: ['src/**/*'],
      additionalInputs: [
        'src/content/selection-unlock.js',
        'src/content/link-rewriter.js', 
        'src/content/asset-collector.js'
      ]
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: 'src/background/index.ts',
        popup: 'src/popup/popup.html',
        sidepanel: 'src/sidepanel/sidepanel.html',
        options: 'src/options/options.html'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    target: 'es2020',
    minify: false // 开发时关闭压缩便于调试
  },
  resolve: {
    alias: {
      '@': '/src',
      '@shared': '/src/shared',
      '@content': '/src/content',
      '@background': '/src/background'
    }
  }
}); 