/**
 * ESLint 配置文件
 *
 * 使用 soybeanjs 的 ESLint 配置作为基础，针对项目实际情况进行微调 只禁用确实需要禁用的规则，保持代码质量标准
 */

import { defineConfig } from '@soybeanjs/eslint-config';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig(
  {
    vue: true,
    unocss: true,
    typescript: true,
    // 用户自定义规则扩展
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
      '@typescript-eslint/no-unsafe-assignment': 'off', // 允许 any 赋值（渐进式迁移）
      '@typescript-eslint/no-unsafe-member-access': 'off', // 允许 any 成员访问
      '@typescript-eslint/no-unsafe-call': 'off', // 允许 any 函数调用
      '@typescript-eslint/no-unsafe-return': 'off', // 允许 any 返回

      /* ===== 仅在确实需要时禁用的规则 ===== */
      'no-param-reassign': 'off', // 某些场景下参数重新赋值是必要的
      'no-plusplus': 'off', // 允许 ++ 操作符（某些场景如 for 循环是合理的）
      'no-continue': 'off', // 允许 continue 语句（某些场景下效率更高）
      'no-underscore-dangle': 'off', // 允许下划线命名（如内部属性、特殊命名约定）
      'class-methods-use-this': 'off', // 允许类方法不使用 this（某些接口实现需要）
      'no-restricted-globals': 'off', // 允许使用某些全局变量（如测试环境需要 global）
      'no-script-url': 'off', // 允许 javascript: URL（用于测试恶意输入）
      'n/prefer-global/process': 'off', // 允许直接使用 process
      'no-await-in-loop': 'off', // 允许在循环中使用 await（某些场景下是必要的）
      'complexity': 'off', // 圈复杂度过高检查（某些算法逻辑确实复杂）
      'max-depth': 'off', // 嵌套深度检查（某些渲染逻辑确实需要较深嵌套）
      'no-nested-ternary': 'off', // 允许嵌套三元运算符（某些场景下更简洁）
      'eqeqeq': 'off', // 允许 == 和 !=（某些场景下有其用途）
      'no-eq-null': 'off', // 允许与 null 的直接比较
      'no-control-regex': 'off', // 允许控制字符正则（某些场景下需要）
      'no-implicit-coercion': 'off', // 允许隐式类型转换（某些场景下更简洁）
      'prefer-template': 'off', // 允许字符串拼接（某些场景下更简洁）
      'no-throw-literal': 'off', // 允许抛出非 Error 对象（测试场景需要）
      'no-alert': 'off', // 允许 alert/confirm/prompt（某些场景需要）
      'no-case-declarations': 'off', // 允许 case 块中声明（某些场景需要）
      'no-multi-assign': 'off', // 允许多重赋值（某些场景合理）
      'radix': 'off', // 允许 parseInt 不传进制（某些场景需要）
      'no-new': 'off', // 允许 new 用于副作用（某些场景需要）
      'no-template-curly-in-string': 'off' // 允许模板字符串表达式（某些场景需要）
    }
  },
  {
    // 保留插件配置作为第二个参数
    plugins: {
      'unused-imports': unusedImports
    },
    rules: {
      // 为特定函数提供例外的规则配置
      'max-params': ['warn', { max: 5 }] // 增加参数限制到 5，适应渲染函数的需要
    }
  }
);
