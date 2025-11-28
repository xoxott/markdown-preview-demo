import { defineConfig } from '@soybeanjs/eslint-config';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig(
  { vue: true, unocss: true, typescript: true },
  {
    // 添加忽略配置
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.vite/**',
      '**/.turbo/**',
      '**/public/**',
      '**/*.min.js'
    ],
    plugins: {
      'unused-imports': unusedImports
    },
    rules: {
      'vue/multi-word-component-names': [
        'warn',
        {
          ignores: ['index', 'App', 'Register', '[id]', '[url]']
        }
      ],
      'vue/component-name-in-template-casing': [
        'warn',
        'PascalCase',
        {
          registeredComponentsOnly: false,
          ignores: ['/^icon-/']
        }
      ],
      'unocss/order-attributify': 'off',
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error']
        }
      ],
      'no-debugger': 'error',

      /* ===== 未使用变量和导入 ===== */
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],

      /* ===== Vue 特定规则 ===== */
      'vue/no-unused-refs': 'warn',
      'vue/no-unused-vars': 'warn',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': 'warn',

      /* ===== TypeScript 类型规则 ===== */
      '@typescript-eslint/no-explicit-any': [
        'warn',
        {
          ignoreRestArgs: true,
          fixToUnknown: false
        }
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off', // 允许 any 赋值（渐进式迁移）
      '@typescript-eslint/no-unsafe-member-access': 'off', // 允许 any 成员访问
      '@typescript-eslint/no-unsafe-call': 'off', // 允许 any 函数调用
      '@typescript-eslint/no-unsafe-return': 'off', // 允许 any 返回

      /* ===== 其他代码风格规则 - 可选择性禁用 ===== */
      'class-methods-use-this': 'off',
      'no-continue': 'off',
      'no-plusplus': 'off'
    }
  }
);
