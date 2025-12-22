import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { setupVitePlugins } from './build/plugins';
import { createViteProxy, getBuildTime } from './build/config';

export default defineConfig(configEnv => {
  const viteEnv = loadEnv(configEnv.mode, process.cwd()) as unknown as Env.ImportMeta;

  const buildTime = getBuildTime();

  const enableProxy = configEnv.command === 'serve' && !configEnv.isPreview;

  return {
    base: viteEnv.VITE_BASE_URL,
    optimizeDeps: {
      exclude: ['@vue/repl'],
      // 预构建常用依赖
      include: [
        'vue',
        'vue-router',
        'pinia',
        '@vueuse/core',
        'dayjs',
        'axios'
      ]
    },
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData: `@use "@/styles/scss/global.scss" as *;`,
          quietDeps: true, // 忽略依赖包的警告
          silenceDeprecations: ['global-builtin', 'import'] // 忽略特定的弃用警告
        }
      }
    },
    plugins: setupVitePlugins(viteEnv, buildTime),
    define: {
      BUILD_TIME: JSON.stringify(buildTime)
    },
    server: {
      host: '0.0.0.0',
      port: 9527,
      open: true,
      proxy: createViteProxy(viteEnv, enableProxy)
    },
    preview: {
      port: 9725
    },
    build: {
      reportCompressedSize: false,
      sourcemap: viteEnv.VITE_SOURCE_MAP === 'Y',
      commonjsOptions: {
        ignoreTryCatch: false
      },
      // 代码分割优化
      rollupOptions: {
        output: {
          // 分离第三方库
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // 大型库单独分包
              if (id.includes('naive-ui')) {
                return 'naive-ui';
              }
              if (id.includes('echarts')) {
                return 'echarts';
              }
              if (id.includes('monaco-editor')) {
                return 'monaco-editor';
              }
              if (id.includes('@vueuse')) {
                return 'vueuse';
              }
              if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
                return 'vue-vendor';
              }
              // 其他第三方库
              return 'vendor';
            }
          },
          // 优化 chunk 文件名
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: '[ext]/[name]-[hash].[ext]'
        }
      },
      // 设置 chunk 大小警告限制
      chunkSizeWarningLimit: 1000
    }
  };
});
