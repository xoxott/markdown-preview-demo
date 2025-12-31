# 组件示例说明

本目录包含各种组件的使用示例，便于快速查看和学习组件的使用方法。

## 目录结构

```
examples/
├── BasicComponentsExample.tsx      # 基础组件示例（上传、倒计时、可编辑文本、圈选等）
├── FlowBasicExample.tsx            # Flow 示例 1: 基础使用
├── FlowConfigExample.tsx           # Flow 示例 2: 配置管理
├── FlowStateExample.tsx            # Flow 示例 3: 状态管理
├── FlowFullFeatureExample.tsx     # Flow 示例 4: 完整功能（带工具组件）
├── FlowPerformanceExample.tsx     # Flow 示例 5: 性能测试
├── FlowEmptyExample.tsx            # Flow 示例 6: 空状态
├── index.ts                        # 示例组件导出
└── README.md                       # 本文件
```

## 如何添加新示例

1. **创建示例组件文件**
   - 在 `examples/` 目录下创建新的 `.tsx` 文件
   - 文件命名规范：`组件名Example.tsx`（如：`TableExample.tsx`）

2. **编写示例组件**
   ```tsx
   import { defineComponent } from 'vue';
   import { NCard, NH3, NText } from 'naive-ui';
   // 导入需要演示的组件
   import YourComponent from '@/components/your-component';

   export default defineComponent({
     name: 'YourComponentExample',
     setup() {
       // 示例逻辑
       return () => (
         <NCard bordered>
           <NH3 class="border-b pb-2 text-lg font-semibold">组件名称示例</NH3>
           <NText class="text-gray-500 mb-4 block">
             示例说明
           </NText>
           {/* 示例内容 */}
         </NCard>
       );
     }
   });
   ```

3. **导出示例组件**
   - 在 `examples/index.ts` 中添加导出：
   ```ts
   export { default as YourComponentExample } from './YourComponentExample';
   ```

4. **在主文件中使用**
   - 在 `src/views/component/index.tsx` 中导入并使用：
   ```tsx
   import { YourComponentExample } from './examples';

   // 在 return 中使用
   <YourComponentExample />
   ```

## 示例组件规范

1. **组件命名**：使用 PascalCase，以 `Example` 结尾
2. **文件命名**：与组件名保持一致
3. **结构规范**：
   - 使用 `NCard` 包裹示例内容
   - 使用 `NH3` 作为标题
   - 使用 `NText` 添加说明文字
   - 保持代码整洁和可读性

4. **功能完整性**：
   - 每个示例应该是完整可运行的
   - 包含必要的交互逻辑
   - 添加适当的注释说明

## 示例分类建议

- **基础组件**：通用 UI 组件（按钮、输入框、卡片等）
- **业务组件**：特定业务场景的组件
- **Flow 组件**：流程图相关组件
- **AI 工作流**：AI 工作流相关组件
- **文件管理**：文件浏览器、上传等组件
- **其他**：其他类型的组件

## 注意事项

- 保持示例代码简洁明了
- 避免在示例中包含复杂的业务逻辑
- 每个示例应该专注于展示一个或一组相关功能
- 及时更新示例以反映组件的最新 API

