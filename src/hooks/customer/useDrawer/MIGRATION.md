# 迁移指南：从旧版本升级到新版本

## 📋 概述

新版本的 `useDrawer` 进行了全面重构，主要改进包括：

- ✅ 使用 TSX 语法替代冗长的 render 函数
- ✅ 抽离 DrawerContainer 为独立组件
- ✅ 增强 DrawerInstance，暴露响应式状态
- ✅ 支持嵌套抽屉
- ✅ 新增更多管理器方法

## 🔄 API 变化

### 1. DrawerInstance 增强

**旧版本：**
```typescript
interface DrawerInstance {
  close: () => void;
  destroy: () => void;
  updateOptions: (options: Partial<DrawerOptions>) => void;
}
```

**新版本：**
```typescript
interface DrawerInstance {
  // 原有方法
  close: () => void;
  destroy: () => void;
  updateOptions: (options: Partial<DrawerOptions>) => void;

  // 新增：响应式状态
  state: {
    visible: Ref<boolean>;
    loading: Ref<boolean>;
    disabled: Ref<boolean>;
  };

  // 新增：手动控制方法
  setLoading: (loading: boolean) => void;
  setDisabled: (disabled: boolean) => void;

  // 新增：确认和取消方法
  confirm: () => Promise<void>;
  cancel: () => Promise<void>;
}
```

### 2. 管理器方法增强

**旧版本：**
```typescript
{
  closeAll: () => void;
  destroyAll: () => void;
  getCount: () => number;
}
```

**新版本：**
```typescript
{
  // 原有方法
  closeAll: () => void;
  destroyAll: () => void;
  getCount: () => number;

  // 新增方法
  closeTop: () => void;                        // 关闭最顶层抽屉
  getInstances: () => DrawerInstance[];        // 获取所有实例
  getTopInstance: () => DrawerInstance | undefined;  // 获取顶层实例
}
```

## 📝 迁移步骤

### 步骤 1: 基础用法（无需修改）

如果你只使用基础功能，代码无需修改：

```typescript
// ✅ 旧版本和新版本都支持
const drawer = useDrawer();

drawer.open({
  title: '标题',
  content: '内容',
  width: 500
});
```

### 步骤 2: 使用实例方法（需要适配）

**旧版本：**
```typescript
const instance = await drawer.open({ ... });

// 只能关闭
instance.close();
```

**新版本（推荐）：**
```typescript
const instance = await drawer.open({ ... });

// 可以访问响应式状态
console.log(instance.state.visible.value);
console.log(instance.state.loading.value);

// 可以手动控制状态
instance.setLoading(true);
instance.setDisabled(true);

// 可以手动触发确认/取消
await instance.confirm();
await instance.cancel();
```

### 步骤 3: 使用 TSX 编写内容（推荐）

**旧版本（h 函数）：**
```typescript
import { h } from 'vue';
import { NForm, NFormItem, NInput } from 'naive-ui';

drawer.open({
  title: '表单',
  content: () => h(NForm, {}, {
    default: () => [
      h(NFormItem, { label: '姓名' }, {
        default: () => h(NInput, { placeholder: '请输入' })
      })
    ]
  })
});
```

**新版本（TSX，推荐）：**
```tsx
drawer.open({
  title: '表单',
  content: () => (
    <NForm>
      <NFormItem label="姓名">
        <NInput placeholder="请输入" />
      </NFormItem>
    </NForm>
  )
});
```

### 步骤 4: 嵌套抽屉（新功能）

**新版本支持嵌套：**
```typescript
// 第一层
const first = await drawer.open({
  title: '第一层',
  content: () => (
    <NButton onClick={openSecond}>打开第二层</NButton>
  )
});

const openSecond = () => {
  // 第二层
  drawer.open({
    title: '第二层',
    content: '嵌套内容',
    placement: 'left'
  });
};

// 管理嵌套抽屉
drawer.closeTop();  // 关闭最顶层
drawer.getCount();  // 获取当前层级数
```

## 🎯 常见迁移场景

### 场景 1: 表单提交时的 Loading 控制

**旧版本（手动管理）：**
```typescript
const loading = ref(false);

drawer.confirm({
  title: '提交表单',
  content: FormComponent,
  confirmButton: {
    text: '提交',
    loading: loading.value  // ❌ 不会响应式更新
  },
  onConfirm: async () => {
    loading.value = true;
    try {
      await submitForm();
    } finally {
      loading.value = false;
    }
  }
});
```

**新版本（自动管理）：**
```typescript
const instance = await drawer.confirm({
  title: '提交表单',
  content: FormComponent,
  onConfirm: async () => {
    // ✅ loading 自动管理
    await submitForm();
  }
});

// 或者手动控制
const instance = await drawer.confirm({
  title: '提交表单',
  content: FormComponent,
  onConfirm: async () => {
    instance.setLoading(true);
    try {
      await submitForm();
    } finally {
      instance.setLoading(false);
    }
  }
});
```

### 场景 2: 监听抽屉状态

**旧版本（不支持）：**
```typescript
// ❌ 无法监听抽屉状态
const instance = await drawer.open({ ... });
```

**新版本（支持）：**
```typescript
const instance = await drawer.open({ ... });

// ✅ 可以监听状态变化
watch(instance.state.visible, (visible) => {
  if (visible) {
    console.log('抽屉打开了');
  } else {
    console.log('抽屉关闭了');
  }
});

watch(instance.state.loading, (loading) => {
  if (loading) {
    // 显示全局 loading
  }
});
```

### 场景 3: 动态控制按钮状态

**旧版本（不支持）：**
```typescript
// ❌ 无法动态控制按钮状态
const instance = await drawer.confirm({ ... });
```

**新版本（支持）：**
```typescript
const instance = await drawer.confirm({ ... });

// ✅ 可以动态控制
instance.setLoading(true);   // 按钮显示 loading
instance.setDisabled(true);  // 禁用按钮

// 根据条件控制
if (someCondition) {
  instance.setDisabled(true);
}
```

### 场景 4: 多抽屉管理

**旧版本：**
```typescript
// 只能关闭所有
drawer.closeAll();
```

**新版本：**
```typescript
// 更多控制选项
drawer.closeTop();           // 关闭最顶层
drawer.closeAll();           // 关闭所有
drawer.destroyAll();         // 销毁所有

// 获取信息
const count = drawer.getCount();           // 当前数量
const instances = drawer.getInstances();   // 所有实例
const top = drawer.getTopInstance();       // 顶层实例
```

## ⚠️ 破坏性变更

### 1. 无破坏性变更

新版本完全向后兼容，所有旧代码都能正常运行。

### 2. 推荐但非必须的变更

以下变更是推荐的，但不是必须的：

1. **使用 TSX 替代 h 函数**
   - 旧方式仍然支持
   - TSX 更简洁易读

2. **使用新的实例方法**
   - 旧方法仍然可用
   - 新方法提供更多功能

3. **使用新的管理器方法**
   - 旧方法仍然可用
   - 新方法提供更精细的控制

## 📦 文件结构变化

**旧版本：**
```
src/hooks/customer/useDrawer/
├── index.ts        # 所有代码都在这里
└── usage.md        # 使用文档
```

**新版本：**
```
src/hooks/customer/useDrawer/
├── index.ts              # 主入口和管理器
├── DrawerContainer.tsx   # 抽屉容器组件（独立）
├── example.tsx           # 使用示例
├── README.md             # 完整文档
├── MIGRATION.md          # 迁移指南
└── usage.md              # 旧文档（保留）
```

## 🎓 学习新特性

### 1. 响应式状态

```typescript
const instance = await drawer.open({ ... });

// 在组件中使用
const isVisible = computed(() => instance.state.visible.value);
const isLoading = computed(() => instance.state.loading.value);

// 在模板中使用
<template>
  <div v-if="instance.state.visible.value">
    抽屉已打开
  </div>
</template>
```

### 2. 手动控制

```typescript
const instance = await drawer.confirm({ ... });

// 根据业务逻辑控制
async function handleSubmit() {
  instance.setLoading(true);

  try {
    const result = await validateForm();
    if (!result) {
      instance.setLoading(false);
      return; // 不关闭抽屉
    }

    await submitData();
    instance.close(); // 手动关闭
  } catch (error) {
    instance.setLoading(false);
    message.error('提交失败');
  }
}
```

### 3. 嵌套抽屉

```typescript
// 打开多层抽屉
const layer1 = await drawer.open({ title: '第一层' });
const layer2 = await drawer.open({ title: '第二层' });
const layer3 = await drawer.open({ title: '第三层' });

// 管理层级
console.log(drawer.getCount()); // 3

// 逐层关闭
drawer.closeTop(); // 关闭第三层
drawer.closeTop(); // 关闭第二层
drawer.closeTop(); // 关闭第一层
```

## ✅ 检查清单

迁移完成后，请检查以下项：

- [ ] 所有抽屉都能正常打开和关闭
- [ ] 确认和取消按钮工作正常
- [ ] Loading 状态显示正确
- [ ] 嵌套抽屉（如果使用）工作正常
- [ ] 自定义按钮功能正常
- [ ] 生命周期钩子正常触发
- [ ] 主题适配正常（暗色/亮色）

## 🆘 常见问题

### Q1: 旧代码还能用吗？

**A:** 能！新版本完全向后兼容，所有旧代码都能正常运行。

### Q2: 必须使用 TSX 吗？

**A:** 不必须。h 函数仍然支持，但推荐使用 TSX，代码更简洁。

### Q3: 如何启用 TSX？

**A:** 将文件扩展名改为 `.tsx`，确保项目配置支持 TSX。

### Q4: 响应式状态是只读的吗？

**A:** 是的。使用 `setLoading`/`setDisabled` 方法修改状态。

### Q5: 嵌套抽屉有层级限制吗？

**A:** 没有。理论上支持无限嵌套。

## 📚 更多资源

- [完整文档](./README.md)
- [使用示例](./example.tsx)
- [类型定义](../../typings/drawer.d.ts)

## 💬 反馈

如果在迁移过程中遇到问题，请及时反馈。

