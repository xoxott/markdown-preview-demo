# useDrawer Hook 使用文档

## 📦 概述

`useDrawer` 是一个功能强大的抽屉组件 Hook，基于 Naive UI 的 Drawer 组件封装，提供了更便捷的 API 和更丰富的功能。

### ✨ 主要特性

- 🎯 **TypeScript 支持** - 完整的类型定义
- 🎨 **TSX 语法** - 更简洁易读的代码
- 🔄 **响应式状态** - 暴露 visible、loading、disabled 状态
- 🪆 **支持嵌套** - 完美支持多层抽屉嵌套
- 🎛️ **增强实例** - 提供更多控制方法
- 📦 **独立组件** - DrawerContainer 单独定义，易于维护
- 🎭 **主题支持** - 自动适配暗色/亮色主题

---

## 🚀 快速开始

### 基础使用

```typescript
import { useDrawer } from '@/hooks/customer/useDrawer';

const drawer = useDrawer();

// 打开基础抽屉
drawer.open({
  title: '抽屉标题',
  content: '这是抽屉内容',
  width: 500
});
```

### 使用 TSX 组件作为内容

```tsx
import { defineComponent } from 'vue';
import { NForm, NFormItem, NInput } from 'naive-ui';

const FormContent = defineComponent({
  setup() {
    const formData = ref({ name: '', email: '' });

    return () => (
      <NForm model={formData.value}>
        <NFormItem label="姓名" path="name">
          <NInput v-model:value={formData.value.name} />
        </NFormItem>
        <NFormItem label="邮箱" path="email">
          <NInput v-model:value={formData.value.email} />
        </NFormItem>
      </NForm>
    );
  }
});

drawer.open({
  title: '表单示例',
  content: FormContent,
  width: 600
});
```

---

## 📚 API 文档

### useDrawer() 返回值

```typescript
{
  // 创建方法
  open: (options: DrawerOptions) => Promise<DrawerInstance>,
  confirm: (options: DrawerOptions) => Promise<DrawerInstance>,
  info: (options: DrawerOptions) => Promise<DrawerInstance>,
  success: (options: DrawerOptions) => Promise<DrawerInstance>,
  warning: (options: DrawerOptions) => Promise<DrawerInstance>,
  error: (options: DrawerOptions) => Promise<DrawerInstance>,

  // 管理方法
  closeAll: () => void,
  destroyAll: () => void,
  closeTop: () => void,
  getCount: () => number,
  getInstances: () => DrawerInstance[],
  getTopInstance: () => DrawerInstance | undefined
}
```

### DrawerOptions 配置项

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| title | `string \| Component \| VNode \| (() => VNode)` | - | 抽屉标题 |
| content | `string \| Component \| VNode \| (() => VNode)` | - | 抽屉内容 |
| width | `number \| string` | 400 | 宽度（左右布局） |
| height | `number \| string` | - | 高度（上下布局） |
| placement | `'top' \| 'right' \| 'bottom' \| 'left'` | 'right' | 抽屉位置 |
| showFooter | `boolean` | false | 是否显示底部按钮 |
| confirmButton | `DrawerButtonConfig \| false` | - | 确认按钮配置 |
| cancelButton | `DrawerButtonConfig \| false` | - | 取消按钮配置 |
| customButtons | `DrawerButtonConfig[]` | - | 自定义按钮列表 |
| showMask | `boolean` | true | 是否显示遮罩层 |
| maskClosable | `boolean` | true | 点击遮罩层是否关闭 |
| closeOnEsc | `boolean` | true | 按 ESC 键是否关闭 |
| closable | `boolean` | true | 是否显示关闭图标 |
| autoFocus | `boolean` | true | 是否自动聚焦 |
| trapFocus | `boolean` | true | 是否锁定焦点 |
| resizable | `boolean` | false | 是否可调整大小 |
| xScrollable | `boolean` | false | 是否启用横向滚动 |
| bodyStyle | `string \| Record<string, string>` | - | 内容区域样式 |
| headerStyle | `string \| Record<string, string>` | - | 头部样式 |
| footerStyle | `string \| Record<string, string>` | - | 底部样式 |
| onConfirm | `() => void \| Promise<void>` | - | 确认回调 |
| onCancel | `() => void \| Promise<void>` | - | 取消回调 |
| onClose | `() => void` | - | 关闭回调 |
| onAfterEnter | `() => void` | - | 进入动画完成回调 |
| onAfterLeave | `() => void` | - | 离开动画完成回调 |
| onMaskClick | `() => void` | - | 点击遮罩层回调 |

### DrawerInstance 实例方法

```typescript
interface DrawerInstance {
  // 基础方法
  close: () => void;                                    // 关闭抽屉
  destroy: () => void;                                  // 销毁抽屉实例
  updateOptions: (options: Partial<DrawerOptions>) => void;  // 更新配置

  // 响应式状态（只读）
  state: {
    visible: Ref<boolean>;   // 可见性状态
    loading: Ref<boolean>;   // 加载状态
    disabled: Ref<boolean>;  // 禁用状态
  };

  // 手动控制方法
  setLoading: (loading: boolean) => void;   // 设置加载状态
  setDisabled: (disabled: boolean) => void; // 设置禁用状态

  // 确认和取消方法
  confirm: () => Promise<void>;  // 手动触发确认
  cancel: () => Promise<void>;   // 手动触发取消
}
```

---

## 💡 使用示例

### 1. 确认抽屉

```typescript
const drawer = useDrawer();

drawer.confirm({
  title: '确认删除',
  content: '确定要删除这条记录吗？此操作不可撤销。',
  onConfirm: async () => {
    await deleteRecord();
    message.success('删除成功');
  }
});
```

### 2. 访问响应式状态

```typescript
const instance = await drawer.confirm({
  title: '编辑信息',
  content: FormComponent,
  onConfirm: async () => {
    await saveData();
  }
});

// 监听状态变化
watch(instance.state.visible, (visible) => {
  console.log('抽屉可见性:', visible);
});

watch(instance.state.loading, (loading) => {
  console.log('加载状态:', loading);
});
```

### 3. 手动控制 Loading

```typescript
const instance = await drawer.confirm({
  title: '提交表单',
  content: FormComponent,
  onConfirm: async () => {
    // 手动控制 loading
    instance.setLoading(true);
    try {
      await submitForm();
      message.success('提交成功');
    } catch (error) {
      message.error('提交失败');
      throw error; // 阻止抽屉关闭
    } finally {
      instance.setLoading(false);
    }
  }
});
```

### 4. 嵌套抽屉

```tsx
const openNestedDrawer = async () => {
  // 第一层抽屉
  const firstDrawer = await drawer.open({
    title: '第一层',
    content: () => (
      <div>
        <p>这是第一层抽屉</p>
        <NButton onClick={openSecondDrawer}>打开第二层</NButton>
      </div>
    ),
    width: 500
  });

  const openSecondDrawer = async () => {
    // 第二层抽屉
    const secondDrawer = await drawer.open({
      title: '第二层',
      content: () => (
        <div>
          <p>这是第二层抽屉</p>
          <NButton onClick={openThirdDrawer}>打开第三层</NButton>
        </div>
      ),
      width: 450,
      placement: 'left'
    });

    const openThirdDrawer = () => {
      // 第三层抽屉
      drawer.info({
        title: '第三层',
        content: '支持无限嵌套！',
        width: 400
      });
    };
  };
};
```

### 5. 自定义按钮

```typescript
drawer.open({
  title: '发布文章',
  content: ArticleEditor,
  showFooter: true,
  customButtons: [
    {
      text: '保存草稿',
      type: 'default',
      onClick: async () => {
        await saveDraft();
        message.success('草稿已保存');
      }
    },
    {
      text: '预览',
      type: 'info',
      onClick: async () => {
        openPreview();
      }
    }
  ],
  confirmButton: { text: '发布', type: 'primary' },
  cancelButton: { text: '取消', type: 'default' },
  onConfirm: async () => {
    await publishArticle();
    message.success('发布成功');
  }
});
```

### 6. 不同类型的抽屉

```typescript
// 信息提示
drawer.info({
  title: '提示',
  content: '这是一条信息提示'
});

// 成功提示
drawer.success({
  title: '成功',
  content: '操作成功完成'
});

// 警告提示
drawer.warning({
  title: '警告',
  content: '请注意这个操作'
});

// 错误提示
drawer.error({
  title: '错误',
  content: '操作失败，请重试'
});
```

### 7. 管理多个抽屉

```typescript
const drawer = useDrawer();

// 获取当前抽屉数量
console.log('当前抽屉数量:', drawer.getCount());

// 获取所有抽屉实例
const instances = drawer.getInstances();

// 获取最顶层的抽屉
const topInstance = drawer.getTopInstance();

// 关闭最顶层的抽屉（用于嵌套场景）
drawer.closeTop();

// 关闭所有抽屉
drawer.closeAll();

// 销毁所有抽屉
drawer.destroyAll();
```

### 8. 动态更新配置

```typescript
const instance = await drawer.open({
  title: '初始标题',
  content: '初始内容'
});

// 更新配置
instance.updateOptions({
  title: '新标题',
  content: '新内容'
});
```

### 9. 完整的表单示例

```tsx
import { defineComponent, ref } from 'vue';
import { NForm, NFormItem, NInput, NSelect } from 'naive-ui';
import { useDrawer } from '@/hooks/customer/useDrawer';
import { useMessage } from 'naive-ui';

export default defineComponent({
  setup() {
    const drawer = useDrawer();
    const message = useMessage();

    const openUserForm = async () => {
      const formData = ref({
        name: '',
        email: '',
        role: null
      });

      const formRef = ref();

      const instance = await drawer.confirm({
        title: '添加用户',
        content: () => (
          <NForm ref={formRef} model={formData.value}>
            <NFormItem
              label="姓名"
              path="name"
              rule={{ required: true, message: '请输入姓名' }}
            >
              <NInput
                v-model:value={formData.value.name}
                placeholder="请输入姓名"
              />
            </NFormItem>
            <NFormItem
              label="邮箱"
              path="email"
              rule={{ required: true, type: 'email', message: '请输入正确的邮箱' }}
            >
              <NInput
                v-model:value={formData.value.email}
                placeholder="请输入邮箱"
              />
            </NFormItem>
            <NFormItem
              label="角色"
              path="role"
              rule={{ required: true, message: '请选择角色' }}
            >
              <NSelect
                v-model:value={formData.value.role}
                options={[
                  { label: '管理员', value: 'admin' },
                  { label: '用户', value: 'user' }
                ]}
                placeholder="请选择角色"
              />
            </NFormItem>
          </NForm>
        ),
        width: 600,
        onConfirm: async () => {
          // 验证表单
          await formRef.value?.validate();

          // 提交数据
          instance.setLoading(true);
          try {
            await createUser(formData.value);
            message.success('用户创建成功');
          } finally {
            instance.setLoading(false);
          }
        }
      });
    };

    return { openUserForm };
  }
});
```

---

## 🎯 最佳实践

### 1. 使用 TSX 编写内容组件

推荐使用 TSX 语法编写抽屉内容，代码更简洁易读：

```tsx
// ✅ 推荐
const content = () => (
  <div>
    <p>内容</p>
    <NButton>按钮</NButton>
  </div>
);

// ❌ 不推荐
const content = () => h('div', [
  h('p', '内容'),
  h(NButton, null, '按钮')
]);
```

### 2. 合理使用响应式状态

利用暴露的响应式状态进行状态监听和控制：

```typescript
const instance = await drawer.open({ ... });

// 监听状态
watch(instance.state.loading, (loading) => {
  if (loading) {
    // 显示全局 loading
  }
});

// 手动控制
instance.setLoading(true);
instance.setDisabled(true);
```

### 3. 错误处理

在 `onConfirm` 中抛出错误可以阻止抽屉关闭：

```typescript
drawer.confirm({
  title: '提交',
  content: '...',
  onConfirm: async () => {
    try {
      await submitData();
    } catch (error) {
      message.error('提交失败');
      throw error; // 阻止抽屉关闭
    }
  }
});
```

### 4. 嵌套抽屉的管理

使用管理器方法管理嵌套抽屉：

```typescript
// 关闭最顶层的抽屉
drawer.closeTop();

// 获取当前抽屉层级
const count = drawer.getCount();

// 获取顶层抽屉实例
const topInstance = drawer.getTopInstance();
```

---

## 🔧 高级用法

### 自定义主题

抽屉会自动适配全局主题设置，无需额外配置。

### 生命周期钩子

```typescript
drawer.open({
  title: '生命周期示例',
  content: '...',
  onAfterEnter: () => {
    console.log('抽屉打开动画完成');
  },
  onAfterLeave: () => {
    console.log('抽屉关闭动画完成');
  },
  onMaskClick: () => {
    console.log('点击了遮罩层');
  },
  onClose: () => {
    console.log('抽屉关闭');
  }
});
```

### 可调整大小的抽屉

```typescript
drawer.open({
  title: '可调整大小',
  content: '...',
  resizable: true,
  width: 500
});
```

---

## 📝 注意事项

1. **自动销毁**: 抽屉关闭后会自动销毁实例，无需手动调用 `destroy()`
2. **异步操作**: `onConfirm` 和 `onCancel` 支持异步操作，会自动管理 loading 状态
3. **错误处理**: 在回调中抛出错误会阻止抽屉关闭
4. **嵌套支持**: 完美支持多层嵌套，每层都有独立的状态管理
5. **响应式状态**: 暴露的状态是只读的，使用 `setLoading`/`setDisabled` 方法修改

---

## 🆚 与旧版本的对比

| 特性 | 旧版本 | 新版本 |
|------|--------|--------|
| 语法 | render 函数 | TSX |
| 组件结构 | 内联定义 | 独立组件 |
| 嵌套支持 | ❌ | ✅ |
| 响应式状态 | ❌ | ✅ |
| 实例方法 | 3 个 | 9 个 |
| 管理器方法 | 3 个 | 6 个 |
| 代码可读性 | 一般 | 优秀 |
| 类型安全 | 良好 | 优秀 |

---

## 📄 License

MIT

