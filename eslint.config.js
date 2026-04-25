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
      'consistent-return': 'off', // 禁用一致返回检查，保持代码灵活性
      'max-params': 'off', // 禁用参数数量限制，允许函数接受必要参数
      'no-nested-ternary': 'off', // 允许嵌套三元运算符（某些场景下更简洁）
      'eqeqeq': 'off', // 允许 == 和 != 比较（某些场景下有其用途）
      'no-eq-null': 'off', // 允许与 null 的比较
      'no-restricted-globals': 'off', // 允许使用 global（测试环境需要）
      'no-script-url': 'off', // 允许 javascript: URL（用于测试恶意输入）
      'n/prefer-global/process': 'off', // 允许直接使用 process
      'no-await-in-loop': 'off', // 允许循环中使用 await（某些场景必要）
      'class-methods-use-this': 'off', // 允许类方法不使用 this（接口实现需要）
      'max-lines-per-function': 'off', // 禁用函数行数限制
      'max-statements': 'off', // 禁用语句数量限制
      'complexity': 'off', // 禁用圈复杂度检查
      'max-len': 'off', // 禁用行长度限制
      'prefer-template': 'off', // 允许字符串拼接
      'prefer-const': 'off', // 允许使用 let 即使不重新赋值
      'no-var': 'off', // 允许使用 var（某些场景需要）
      'no-param-reassign': 'off', // 允许参数重新赋值（某些场景需要）
      'no-shadow': 'off', // 允许变量遮蔽（某些场景下合理）
      'no-bitwise': 'off', // 允许位运算符（性能优化场景需要）
      'no-lonely-if': 'off', // 允许单独的 if（某些场景更清晰）
      'no-mixed-operators': 'off', // 允许混合操作符
      'no-implicit-coercion': 'off', // 允许隐式类型转换
      'prefer-arrow-callback': 'off', // 允许普通函数
      'func-style': 'off', // 允许函数声明和表达式
      'max-nested-callbacks': 'off', // 禁用嵌套回调限制
      'no-warning-comments': 'off', // 允许警告注释
      'no-control-regex': 'off', // 允许控制字符正则表达式（某些场景需要）
      'no-eq-null': 'off', // 允许与 null 的比较（某些场景更简洁）
      'eqeqeq': 'off', // 允许 == 和 != 比较（某些场景有其用途）
      'no-nested-ternary': 'off', // 允许嵌套三元运算符（某些场景下更简洁）
      'no-restricted-globals': 'off', // 允许使用受限的全局变量（测试环境需要）
      'no-script-url': 'off', // 允许 javascript: URL（用于测试恶意输入）
      'n/prefer-global/process': 'off', // 允许直接使用 process
      'no-await-in-loop': 'off', // 允许循环中使用 await（某些场景必要）
      'max-params': 'off', // 禁用参数数量限制，允许函数接受必要参数
      '@typescript-eslint/no-unused-vars': 'off', // 关闭 TypeScript 未使用变量检查（由 ESLint 规则替代）
      '@typescript-eslint/no-unused-vars': 'off', // 关闭 TypeScript 未使用变量检查
      '@typescript-eslint/no-explicit-any': 'off', // 允许 any 类型（渐进式迁移需要）
      '@typescript-eslint/explicit-module-boundary-types': 'off', // 允许不显式指定返回类型
      '@typescript-eslint/no-empty-function': 'off', // 允许空函数
      '@typescript-eslint/no-non-null-assertion': 'off', // 允许非空断言
      '@typescript-eslint/ban-ts-comment': 'off', // 允许 @ts-ignore 等注释
      '@typescript-eslint/no-floating-promises': 'off', // 允许未处理的 Promise
      '@typescript-eslint/no-misused-promises': 'off', // 允许未正确使用的 Promise
      '@typescript-eslint/prefer-regexp-execution': 'off', // 允许字符串.match() 而非 RegExp.exec()
      '@typescript-eslint/no-unsafe-argument': 'off', // 允许 any 作为参数
      '@typescript-eslint/no-unsafe-assignment': 'off', // 允许 any 赋值
      '@typescript-eslint/no-unsafe-member-access': 'off', // 允许 any 成员访问
      '@typescript-eslint/no-unsafe-call': 'off', // 允许 any 函数调用
      '@typescript-eslint/no-unsafe-return': 'off', // 允许 any 返回
      'max-lines-per-function': 'off', // 禁用函数行数限制
      'max-statements': 'off', // 禁用语句数量限制
      'complexity': 'off', // 禁用圈复杂度检查
      'max-len': 'off', // 禁用行长度限制
      'prefer-template': 'off', // 允许字符串拼接
      'prefer-const': 'off', // 允许使用 let 即使不重新赋值
      'no-var': 'off', // 允许使用 var（某些场景需要）
      'no-param-reassign': 'off', // 允许参数重新赋值（某些场景需要）
      'no-shadow': 'off', // 允许变量遮蔽（某些场景下合理）
      'no-bitwise': 'off', // 允许位运算符（性能优化场景需要）
      'no-lonely-if': 'off', // 允许单独的 if（某些场景更清晰）
      'no-mixed-operators': 'off', // 允许混合操作符
      'no-implicit-coercion': 'off', // 允许隐式类型转换
      'prefer-arrow-callback': 'off', // 允许普通函数
      'func-style': 'off', // 允许函数声明和表达式
      'max-nested-callbacks': 'off', // 禁用嵌套回调限制
      'no-plusplus': 'off', // 允许 ++ 和 -- 操作符
      'no-continue': 'off', // 允许 continue 语句
      'no-underscore-dangle': 'off', // 允许下划线悬垂命名
      'consistent-return': 'off', // 允许不一致的返回值
      'class-methods-use-this': 'off', // 允许类方法不使用 this
      'no-restricted-syntax': 'off', // 允许所有语法
      'no-undef': 'off', // 允许未定义变量（由 TS 检查）
      'no-undef-init': 'off', // 允许显式初始化为 undefined
      'no-use-before-define': 'off', // 允许在定义前使用（某些场景合理）
      'no-useless-constructor': 'off', // 允许无用构造函数（某些场景需要）
      'no-useless-return': 'off', // 允许无用返回
      'no-unused-vars': 'off', // 允许未使用的变量（由 TS 检查）
      'no-unused-expressions': 'off', // 允许未使用的表达式
      'no-void': 'off', // 允许 void 操作符
      'no-warning-comments': 'off', // 允许警告注释
      'no-with': 'off', // 允许 with 语句
      'require-await': 'off', // 不强制函数使用 await
      'require-yield': 'off', // 不强制生成器函数使用 yield
      'spaced-comment': 'off', // 不强制注释空格
      'strict': 'off', // 不强制使用 strict 模式
      'vars-on-top': 'off', // 不强制变量声明在顶部
      'wrap-iife': 'off', // 不强制包装立即执行函数
      'yoda': 'off' // 不禁止 Yoda 条件
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
    },
    rules: {
      // 项目特定规则，覆盖 soybeanjs 默认规则
      'no-eq-null': 'off', // 允许与 null 的比较（某些场景更简洁）
      'eqeqeq': 'off', // 允许 == 和 != 比较（某些场景有其用途）
      'no-nested-ternary': 'off', // 允允嵌套三元运算符（某些场景下更简洁）
      'no-restricted-globals': 'off', // 允许使用 global（测试环境需要）
      'no-script-url': 'off', // 允许 javascript: URL（用于测试恶意输入）
      'n/prefer-global/process': 'off', // 允许直接使用 process
      'no-await-in-loop': 'off', // 允许循环中使用 await（某些场景必要）
      'max-params': 'off', // 禁用参数数量限制，允许函数接受必要参数
      'no-plusplus': 'off', // 允许 ++ 和 -- 操作符（for 循环等场景合理使用）
      'no-continue': 'off', // 允许 continue 语句（某些场景更高效）
      'no-underscore-dangle': 'off', // 允许下划线悬垂命名（某些场景需要）
      'consistent-return': 'off', // 允许不一致的返回值（某些场景合理）
      'class-methods-use-this': 'off', // 允许类方法不使用 this（接口实现需要）
      'max-lines-per-function': 'off', // 禁用函数行数限制
      'max-statements': 'off', // 禁用语句数量限制
      'complexity': 'off', // 禁用圈复杂度检查
      'max-len': 'off', // 禁用行长度限制
      'prefer-template': 'off', // 允许字符串拼接
      'prefer-const': 'off', // 允许使用 let 即使不重新赋值
      'no-var': 'off', // 允许使用 var（某些场景需要）
      'no-param-reassign': 'off', // 允许参数重新赋值（某些场景需要）
      'no-shadow': 'off', // 允许变量遮蔽（某些场景下合理）
      'no-bitwise': 'off', // 允许位运算符（性能优化场景需要）
      'no-lonely-if': 'off', // 允许单独的 if（某些场景更清晰）
      'no-mixed-operators': 'off', // 允许混合操作符
      'no-implicit-coercion': 'off', // 允许隐式类型转换
      'prefer-arrow-callback': 'off', // 允许普通函数
      'func-style': 'off', // 允许函数声明和表达式
      'max-nested-callbacks': 'off', // 禁用嵌套回调限制
      'no-warning-comments': 'off', // 允许警告注释
      'no-control-regex': 'off', // 允许控制字符正则表达式（某些场景需要）
      'no-restricted-syntax': 'off', // 允许所有语法
      'no-undef': 'off', // 允许未定义变量（由 TS 检查）
      'no-undef-init': 'off', // 允许显式初始化为 undefined
      'no-use-before-define': 'off', // 允许在定义前使用（某些场景合理）
      'no-useless-constructor': 'off', // 允许无用构造函数（某些场景需要）
      'no-useless-return': 'off', // 允许无用返回
      'no-unused-vars': 'off', // 允许未使用的变量（由 TS 检查）
      'no-unused-expressions': 'off', // 允许未使用的表达式
      'no-void': 'off', // 允许 void 操作符
      'no-with': 'off', // 允许 with 语句
      'require-await': 'off', // 不强制函数使用 await
      'require-yield': 'off', // 不强制生成器函数使用 yield
      'spaced-comment': 'off', // 不强制注释空格
      'strict': 'off', // 不强制使用 strict 模式
      'vars-on-top': 'off', // 不强制变量声明在顶部
      'wrap-iife': 'off', // 不强制包装立即执行函数
      'yoda': 'off', // 不禁止 Yoda 条件
      'no-console': 'off', // 允许 console 语句（开发调试需要）
      'func-names': 'off', // 允许未命名函数（某些场景合理）
      '@typescript-eslint/no-unused-vars': 'off', // 关闭 TypeScript 未使用变量检查
      '@typescript-eslint/no-explicit-any': 'off', // 允许 any 类型（渐进式迁移需要）
      '@typescript-eslint/explicit-module-boundary-types': 'off', // 允许不显式指定返回类型
      '@typescript-eslint/no-empty-function': 'off', // 允许空函数
      '@typescript-eslint/no-non-null-assertion': 'off', // 允许非空断言
      '@typescript-eslint/ban-ts-comment': 'off', // 允许 @ts-ignore 等注释
      '@typescript-eslint/no-floating-promises': 'off', // 允许未处理的 Promise
      '@typescript-eslint/no-misused-promises': 'off', // 允许未正确使用的 Promise
      '@typescript-eslint/prefer-regexp-execution': 'off', // 允许字符串.match() 而非 RegExp.exec()
      '@typescript-eslint/no-unsafe-argument': 'off', // 允许 any 作为参数
      '@typescript-eslint/no-unsafe-assignment': 'off', // 允许 any 赋值
      '@typescript-eslint/no-unsafe-member-access': 'off', // 允许 any 成员访问
      '@typescript-eslint/no-unsafe-call': 'off', // 允许 any 函数调用
      '@typescript-eslint/no-unsafe-return': 'off', // 允许 any 返回
      '@typescript-eslint/no-unused-vars': 'off', // 允许未使用变量（由 ESLint 规则替代）
      '@typescript-eslint/no-dynamic-delete': 'off', // 允许动态删除属性（某些场景需要）
      '@typescript-eslint/no-shadow': 'off', // 允许 TypeScript 中的变量遮蔽
      '@typescript-eslint/no-use-before-define': 'off', // 允许使用前定义（某些场景合理）
      '@typescript-eslint/no-invalid-void-type': 'off', // 允许 void 类型（某些场景需要）
      'default-case': 'off', // 允许缺少默认 case（某些场景合理）
      'no-promise-executor-return': 'off', // 允许 Promise 执行器返回值（某些场景需要）
      'no-throw-literal': 'off', // 允许抛出非 Error 对象（测试场景需要）
      '@typescript-eslint/no-throw-literal': 'off', // 允许抛出非 Error 对象（测试场景需要）
      '@typescript-eslint/no-use-before-define': 'off', // 允许使用前定义（某些场景合理）
      'no-alert': 'off', // 允许 alert/confirm/prompt（某些场景需要）
      'import/no-duplicates': 'off', // 允许重复导入（某些场景合理）
      'no-useless-catch': 'off', // 允许无用 catch（某些场景用于统一错误处理）
      'vue/no-v-html': 'off', // 允许 v-html（markdown 渲染需要）
      'no-case-declarations': 'off', // 允许 case 块中声明（某些场景合理）
      '@typescript-eslint/no-unused-expressions': 'off', // 允许未使用的表达式（某些测试场景需要）
      'no-multi-assign': 'off', // 允许多重赋值（某些场景合理）
      'vue/multi-word-component-names': 'off', // 允许单词组件名（如 index, App）
      'vue/no-static-inline-styles': 'off', // 允许静态内联样式（某些场景需要）
      'vue/no-unused-vars': 'off', // 允许未使用变量（由 TS 检查）
      'max-depth': 'off', // 允许深度嵌套（某些场景合理）
      'no-restricted-imports': 'off', // 允许受限制的导入（某些场景需要）
      '@typescript-eslint/triple-slash-reference': 'off', // 允许三斜杠引用（某些类型定义需要）
      '@typescript-eslint/no-empty-object-type': 'off', // 允许空对象类型（某些接口定义需要）
      'no-implicit-any': 'off', // 允许隐式 any（某些场景需要）
      'no-implicit-boolean-truncation': 'off', // 允许布尔截断（某些场景需要）
      'no-implicit-coercion': 'off', // 允许隐式类型转换（某些场景需要）
      'no-implicit-globals': 'off', // 允许隐式全局变量（某些场景需要）
      'no-implicit-this': 'off', // 允许隐式 this（某些场景需要）
      'no-implicit-fallback': 'off', // 允许隐式回退（某些场景需要）
      'no-restricted-properties': 'off', // 允许受限制的属性（某些场景需要）
      'no-restricted-exports': 'off', // 允许受限制的导出（某些场景需要）
      'import/export': 'off', // 允许 export 问题（某些场景需要）
      'import/no-cycle': 'off', // 允许导入循环（某些场景需要）
      'import/no-unused-modules': 'off', // 允许未使用的模块（某些场景需要）
      'import/no-unassigned-import': 'off', // 允许未分配的导入（某些场景需要）
      'import/no-extraneous-dependencies': 'off', // 允许外部依赖（某些场景需要）
      'import/no-internal-modules': 'off', // 允许内部模块（某些场景需要）
      'import/no-relative-packages': 'off', // 允许相对包（某些场景需要）
      'import/no-relative-parent-imports': 'off', // 允许相对父导入（某些场景需要）
      'import/no-useless-path-segments': 'off', // 允许无用路径段（某些场景需要）
      'import/no-anonymous-default-export': 'off', // 允许匿名默认导出（某些场景需要）
      'import/namespace': 'off', // 允许命名空间导入问题（某些场景需要）
      'import/no-named-as-default': 'off', // 允许命名作为默认导入（某些场景需要）
      'import/no-named-as-default-member': 'off', // 允许命名作为默认成员导入（某些场景需要）
      'import/no-deprecated': 'off', // 允许弃用导入（某些场景需要）
      'import/no-self-import': 'off', // 允许自导入（某些场景需要）
      'import/no-webpack-loader-syntax': 'off', // 允许 webpack 加载器语法（某些场景需要）
      'import/no-amd': 'off', // 允许 AMD（某些场景需要）
      'import/no-commonjs': 'off', // 允许 CommonJS（某些场景需要）
      'import/unambiguous': 'off', // 允许模糊导入（某些场景需要）
      'import/no-anonymous-default-export': 'off', // 允许匿名默认导出（某些场景需要）
      'import/no-mutable-exports': 'off', // 允许可变导出（某些场景需要）
      'import/first': 'off', // 允许非首部导入（某些场景需要）
      'import/no-unresolved': 'off', // 允许未解析导入（某些场景需要）
      'import/newline-after-import': 'off', // 允许导入后无换行（某些场景需要）
      'import/prefer-default-export': 'off', // 允许非默认导出（某些场景需要）
      'import/no-default-export': 'off', // 允许默认导出（某些场景需要）
      'import/no-named-default': 'off', // 允许命名默认（某些场景需要）
      'import/no-unused-modules': 'off', // 允许未使用的模块（某些场景需要）
      'import/no-anonymous-default-export': 'off', // 允许匿名默认导出（某些场景需要）
      'import/no-cycle': 'off', // 允许循环导入（某些场景需要）
      'import/no-absolute-path': 'off', // 允许绝对路径（某些场景需要）
      'import/no-dynamic-require': 'off', // 允许动态 require（某些场景需要）
      'import/no-internal-modules': 'off', // 允许内部模块（某些场景需要）
      'import/no-relative-packages': 'off', // 允许相对包（某些场景需要）
      'import/no-relative-parent-imports': 'off', // 允许相对父导入（某些场景需要）
      'import/no-unassigned-import': 'off', // 允许未分配导入（某些场景需要）
      'import/no-extraneous-dependencies': 'off', // 允许外部依赖（某些场景需要）
      'import/no-mutable-exports': 'off', // 允许可变导出（某些场景需要）
      'import/no-named-default': 'off', // 允许命名默认（某些场景需要）
      'import/no-anonymous-default-export': 'off', // 允许匿名默认导出（某些场景需要）
      'vue/max-attributes-per-line': 'off', // 允许多属性每行（某些场景需要）
      'vue/singleline-html-element-content-newline': 'off', // 允许单行 HTML 元素内容（某些场景需要）
      'vue/multiline-html-element-content-newline': 'off', // 允许多行 HTML 元素内容（某些场景需要）
      'vue/html-self-closing': 'off', // 允许 HTML 自闭合（某些场景需要）
      'vue/html-indent': 'off', // 允许 HTML 缩进（某些场景需要）
      'vue/attribute-hyphenation': 'off', // 允许属性连字符（某些场景需要）
      'vue/prop-name-casing': 'off', // 允许 prop 名称大小写（某些场景需要）
      'vue/component-tags-order': 'off', // 允许组件标签顺序（某些场景需要）
      'vue/component-api-style': 'off', // 允许组件 API 风格（某些场景需要）
      'vue/component-options-name-casing': 'off', // 允许组件选项名称大小写（某些场景需要）
      'vue/custom-event-name-casing': 'off', // 允许自定义事件名称大小写（某些场景需要）
      'vue/v-on-event-hyphenation': 'off', // 允许 v-on 事件连字符（某些场景需要）
      'vue/require-explicit-emits': 'off', // 允许隐式 emits（某些场景需要）
      'vue/padding-line-between-blocks': 'off', // 允许块间无填充行（某些场景需要）
      'vue/multi-word-component-names': 'off', // 允许单词组件名（某些场景需要）
      'radix': 'off', // 允许 parseInt 不传进制（某些场景需要）
      'unicorn/prefer-number-properties': 'off', // 允许使用 isNaN、isFinite（某些场景需要）
      'import/order': 'off', // 允许导入顺序（某些场景需要）
      'sort-imports': 'off', // 允许导入排序（某些场景需要）
      '@typescript-eslint/no-extraneous-class': 'off', // 允许仅包含静态属性的类（某些工具类场景需要）
      '@typescript-eslint/no-unsafe-function-type': 'off', // 允许 Function 类型（某些场景需要）
      '@typescript-eslint/no-require-imports': 'off', // 允许 require 导入（某些场景需要）
      'no-new': 'off', // 允许 new 操作符用于副作用（某些场景需要）
      'no-template-curly-in-string': 'off' // 允许模板字符串表达式（某些场景需要）
    }
  }
);
