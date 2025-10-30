# Drawer 组件使用文档

## 基础使用

### 1. 简单抽屉

```typescript
import { useDrawer } from '@/hooks/useDrawer';

const drawer = useDrawer();

// 打开基础抽屉
drawer.open({
  title: '抽屉标题',
  content: '这是抽屉内容',
  width: 500
});
```

### 2. 使用组件作为内容

```typescript
import MyComponent from './MyComponent.vue';

drawer.open({
  title: '组件示例',
  content: MyComponent,
  width: 600
});
```

### 3. 使用渲染函数

```typescript
import { h } from 'vue';
import { NForm, NFormItem, NInput } from 'naive-ui';

drawer.open({
  title: '表单示例',
  content: () => h(NForm, {}, {
    default: () => [
      h(NFormItem, { label: '用户名' }, {
        default: () => h(NInput, { placeholder: '请输入用户名' })
      }),
      h(NFormItem, { label: '邮箱' }, {
        default: () => h(NInput, { placeholder: '请输入邮箱' })
      })
    ]
  }),
  width: 500
});
```

## 确认对话框模式

### 1. 基础确认框

```typescript
drawer.confirm({
  title: '删除确认',
  content: '确定要删除这条数据吗？',
  onConfirm: async () => {
    await deleteData();
    console.log('删除成功');
  },
  onCancel: () => {
    console.log('取消删除');
  }
});
```

### 2. 自定义按钮文本和类型

```typescript
drawer.confirm({
  title: '提交审核',
  content: '确定要提交审核吗？',
  confirmButton: {
    text: '提交',
    type: 'success'
  },
  cancelButton: {
    text: '稍后再说',
    type: 'default'
  },
  onConfirm: async () => {
    await submitReview();
  }
});
```

## 便捷方法

### 1. Info 提示

```typescript
drawer.info({
  title: '提示',
  content: '操作成功完成！',
  confirmButton: {
    text: '知道了'
  }
});
```

### 2. Success 成功提示

```typescript
drawer.success({
  title: '成功',
  content: '数据保存成功！'
});
```

### 3. Warning 警告提示

```typescript
drawer.warning({
  title: '警告',
  content: '当前操作可能影响其他数据'
});
```

### 4. Error 错误提示

```typescript
drawer.error({
  title: '错误',
  content: '操作失败，请稍后重试'
});
```

## 高级功能

### 1. 自定义按钮

```typescript
drawer.open({
  title: '多按钮示例',
  content: '内容...',
  showFooter: true,
  customButtons: [
    {
      text: '重置',
      type: 'warning',
      onClick: () => {
        console.log('重置表单');
      }
    },
    {
      text: '保存草稿',
      type: 'default',
      closeOnClick: true, // 点击后关闭抽屉
      onClick: async () => {
        await saveDraft();
      }
    }
  ],
  confirmButton: {
    text: '提交',
    type: 'primary'
  },
  cancelButton: {
    text: '取消'
  }
});
```

### 2. 控制抽屉实例

```typescript
// 创建抽屉并保存实例
const instance = await drawer.open({
  title: '可控抽屉',
  content: '内容...'
});

// 手动关闭
instance.close();

// 更新配置
instance.updateOptions({
  title: '新标题'
});

// 销毁实例
instance.destroy();
```

### 3. 处理异步操作

```typescript
drawer.confirm({
  title: '提交表单',
  content: '确定要提交吗？',
  onConfirm: async () => {
    // 显示加载状态
    try {
      await submitForm();
      // 成功后自动关闭
    } catch (error) {
      // 失败时不关闭，保持抽屉打开
      console.error('提交失败:', error);
      throw error; // 重新抛出以阻止关闭
    }
  }
});
```

### 4. 生命周期钩子

```typescript
drawer.open({
  title: '生命周期示例',
  content: '内容...',
  onAfterEnter: () => {
    console.log('抽屉打开动画完成');
  },
  onAfterLeave: () => {
    console.log('抽屉关闭动画完成');
  },
  onClose: () => {
    console.log('抽屉关闭');
  },
  onMaskClick: () => {
    console.log('点击了遮罩层');
  }
});
```

### 5. 不同位置的抽屉

```typescript
// 从右侧打开（默认）
drawer.open({
  title: '右侧抽屉',
  content: '内容...',
  placement: 'right'
});

// 从左侧打开
drawer.open({
  title: '左侧抽屉',
  content: '内容...',
  placement: 'left',
  width: 300
});

// 从顶部打开
drawer.open({
  title: '顶部抽屉',
  content: '内容...',
  placement: 'top',
  height: 400
});

// 从底部打开
drawer.open({
  title: '底部抽屉',
  content: '内容...',
  placement: 'bottom',
  height: 300
});
```

### 6. 自定义样式

```typescript
drawer.open({
  title: '自定义样式',
  content: '内容...',
  bodyStyle: {
    padding: '24px',
    backgroundColor: '#f5f5f5'
  },
  headerStyle: {
    backgroundColor: '#1890ff',
    color: '#fff'
  },
  footerStyle: {
    borderTop: '2px solid #1890ff'
  }
});
```

### 7. 管理多个抽屉

```typescript
const drawer = useDrawer();

// 打开多个抽屉
drawer.open({ title: '抽屉1', content: '内容1' });
drawer.open({ title: '抽屉2', content: '内容2' });
drawer.open({ title: '抽屉3', content: '内容3' });

// 获取当前打开的抽屉数量
const count = drawer.getCount();
console.log(`当前有 ${count} 个抽屉打开`);

// 关闭所有抽屉
drawer.closeAll();

// 或直接销毁所有抽屉（不等待动画）
drawer.destroyAll();
```

### 8. 响应式内容

```typescript
import { defineComponent, ref } from 'vue';

const FormDrawer = defineComponent({
  setup() {
    const formData = ref({
      name: '',
      email: ''
    });

    const handleSubmit = async () => {
      await submitData(formData.value);
    };

    return { formData, handleSubmit };
  },
  // template...
});

drawer.open({
  title: '编辑用户',
  content: FormDrawer,
  width: 600,
  showFooter: true,
  onConfirm: async () => {
    // 处理提交
  }
});
```

### 9. 启用横向滚动

```typescript
// 默认情况下，抽屉内容使用 Naive UI 的滚动条组件，仅显示纵向滚动
drawer.open({
  title: '长内容',
  content: '很长的内容...',
  width: 600
});

// 如果需要同时支持横向滚动（例如显示宽表格）
drawer.open({
  title: '宽表格',
  content: WideTableComponent,
  width: 800,
  xScrollable: true // 启用横向滚动
});
```

## 配置选项完整说明

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| title | string \| Component \| VNode \| Function | - | 抽屉标题 |
| content | string \| Component \| VNode \| Function | - | 抽屉内容 |
| width | number \| string | 400 | 抽屉宽度 |
| height | number \| string | - | 抽屉高度 |
| placement | 'top' \| 'right' \| 'bottom' \| 'left' | 'right' | 抽屉位置 |
| showFooter | boolean | false | 是否显示底部按钮 |
| confirmButton | DrawerButtonConfig \| false | - | 确认按钮配置 |
| cancelButton | DrawerButtonConfig \| false | - | 取消按钮配置 |
| customButtons | DrawerButtonConfig[] | - | 自定义按钮列表 |
| showMask | boolean | true | 是否显示遮罩层 |
| maskClosable | boolean | true | 点击遮罩层是否关闭 |
| closeOnEsc | boolean | true | 按 ESC 键是否关闭 |
| closable | boolean | true | 是否显示关闭图标 |
| autoFocus | boolean | true | 是否自动聚焦 |
| trapFocus | boolean | true | 是否锁定焦点 |
| resizable | boolean | false | 是否可调整大小 |
| xScrollable | boolean | false | 是否启用横向滚动（默认只显示纵向滚动条） |
| bodyStyle | string \| object | - | 内容区域样式 |
| headerStyle | string \| object | - | 头部样式 |
| footerStyle | string \| object | - | 底部样式 |
| onConfirm | Function | - | 确认回调 |
| onCancel | Function | - | 取消回调 |
| onClose | Function | - | 关闭回调 |
| onAfterEnter | Function | - | 打开动画完成回调 |
| onAfterLeave | Function | - | 关闭动画完成回调 |
| onMaskClick | Function | - | 点击遮罩层回调 |

## 注意事项

1. **动画时序**：组件已自动处理打开和关闭的动画时序，无需手动控制
2. **异步操作**：在 `onConfirm` 中抛出错误可以阻止抽屉关闭
3. **内存管理**：抽屉关闭时会自动销毁实例，释放内存
4. **多实例**：支持同时打开多个抽屉，每个抽屉独立管理
5. **样式隔离**：每个抽屉实例都有独立的 Provider，确保样式和状态隔离
6. **滚动条**：抽屉内容自动使用 Naive UI 的滚动条组件，提供更好的视觉效果和用户体验。默认仅显示纵向滚动，可通过 `xScrollable` 选项启用横向滚动