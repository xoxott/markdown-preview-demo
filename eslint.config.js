import { defineConfig } from '@soybeanjs/eslint-config';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig(
  {
    vue: true,
    unocss: true,
    typescript: true,
    // 用户自定义规则扩展
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
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],

      /* ===== Vue 特定规则 ===== */
      'vue/no-unused-refs': 'warn',
      'vue/no-unused-vars': 'warn',

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
      'no-plusplus': 'off', // 允许 ++ 和 -- 操作符（for 循环等场景合理使用）
      'max-depth': 'off', // 禁用深度限制，避免复杂渲染逻辑报错
      'func-names': 'off', // 禁用函数命名检查，保持代码简洁
      'no-underscore-dangle': 'off', // 禁用下划线悬垂检查，允许 __zoom 等命名
      'consistent-return': 'off' // 禁用一致返回检查，保持代码灵活性
    },
    // 添加忽略配置
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.vite/**',
      '**/.turbo/**',
      '**/public/**',
      '**/*.min.js'
    ]
  },
  {
    // 保留插件配置作为第二个参数
    plugins: {
      'unused-imports': unusedImports
    }
  }
);
