/**
 * ESLint 配置文件
 *
 * 使用 soybeanjs 的 ESLint 配置作为基础，针对项目实际情况进行微调
 * 分批恢复规则，保持代码质量标准
 */

import { defineConfig } from '@soybeanjs/eslint-config';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig(
  {
    vue: true,
    unocss: true,
    typescript: true,
    ignores: ['public/local/**'],
    rules: {
      /* ===== 项目特定配置 ===== */
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
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn'
    }
  },
  {
    // 第二个配置对象排在 defineConfig 最后，确保覆盖默认配置
    plugins: {
      'unused-imports': unusedImports
    },
    rules: {
      /* ===== 第一批：高价值 + 可自动修复的规则 ===== */
      'eqeqeq': 'error',
      'no-underscore-dangle': [
        'warn',
        {
          allowAfterThis: true,
          allowAfterSuper: true,
          enforceInMethodNames: false
        }
      ],
      'no-plusplus': ['warn', { allowForLoopAfterthoughts: true }],
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTaggedTemplates: true,
          allowTernary: true
        }
      ],
      'no-sequences': 'error',
      'prefer-template': 'warn',

      /* ===== 第三批：代码结构规则 ===== */
      'no-param-reassign': ['warn', { props: true }],
      'class-methods-use-this': 'warn',
      'no-nested-ternary': 'warn',
      'no-multi-assign': 'warn',
      'consistent-return': 'warn',
      'max-params': ['warn', { max: 4 }],

      /* ===== 第四批：保持 off 的规则（项目有合理场景） ===== */
      'no-await-in-loop': 'off',
      'no-continue': 'off',
      'complexity': 'off',
      'max-depth': 'off',
      'no-control-regex': 'off',
      'no-implicit-coercion': 'off',
      'no-throw-literal': 'off',
      'no-alert': 'off',
      'no-case-declarations': 'off',
      'no-new': 'off',
      'no-script-url': 'off',
      'no-restricted-globals': 'off',
      'n/prefer-global/process': 'off',
      'no-template-curly-in-string': 'off',
      'radix': 'off',
      'no-eq-null': 'off',
      'no-bitwise': 'off'
    }
  }
);