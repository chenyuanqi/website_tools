import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
  plugins: [
    webExtension({
      manifest: './src/manifest.json',
      watchFilePaths: ['src/**/*'],
      additionalInputs: [
        'src/background/index.ts',
        'src/content/selection-unlock.ts',
        'src/content/link-rewriter.ts', 
        'src/content/asset-collector.ts'
      ]
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        format: 'es' // 明确指定ES模块格式
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