# 更新日志

## 🎉 v2.0.0 - 重大重构

### ✨ 新特性

#### 1. TSX 语法支持
- ✅ 使用 TSX 替代冗长的 render 函数
- ✅ 代码更简洁、易读、易维护
- ✅ 更好的类型推断和 IDE 支持

**对比：**
```typescript
// 旧版本 - render 函数
h(NDrawer, { ... }, {
  default: () => h(NDrawerContent, { ... }, {
    default: () => h(NScrollbar, { ... })
  })
})

// 新版本 - TSX
<NDrawer {...props}>
  <NDrawerContent {...contentProps}>
    <NScrollbar {...scrollProps} />
  </NDrawerContent>
</NDrawer>
```

#### 2. 独立组件架构
- ✅ DrawerContainer 抽离为独立的 `.tsx` 文件
- ✅ 职责分离，代码结构更清晰
- ✅ 易于单独测试和维护

**文件结构：**
```
useDrawer/
├── index.ts              # 管理器和 Hook
├── DrawerContainer.tsx   # 抽屉容器组件
├── example.tsx           # 使用示例
├── README.md             # 完整文档
├── MIGRATION.md          # 迁移指南
└── CHANGELOG.md          # 更新日志
```

#### 3. 增强的 DrawerInstance
- ✅ 暴露响应式状态（visible, loading, disabled）
- ✅ 新增手动控制方法（setLoading, setDisabled）
- ✅ 新增确认和取消方法（confirm, cancel）

**新增 API：**
```typescript
interface DrawerInstance {
  // 响应式状态（只读）
  state: {
    visible: Ref<boolean>;
    loading: Ref<boolean>;
    disabled: Ref<boolean>;
  };
  
  // 手动控制方法
  setLoading: (loading: boolean) => void;
  setDisabled: (disabled: boolean) => void;
  
  // 确认和取消方法
  confirm: () => Promise<void>;
  cancel: () => Promise<void>;
}
```

#### 4. 嵌套抽屉支持
- ✅ 完美支持多层抽屉嵌套
- ✅ 使用栈结构管理抽屉层级
- ✅ 新增 closeTop() 方法关闭顶层抽屉

**示例：**
```typescript
// 支持无限嵌套
const layer1 = await drawer.open({ title: '第一层' });
const layer2 = await drawer.open({ title: '第二层' });
const layer3 = await drawer.open({ title: '第三层' });

drawer.closeTop(); // 关闭最顶层
```

#### 5. 增强的管理器方法
- ✅ closeTop() - 关闭最顶层抽屉
- ✅ getInstances() - 获取所有抽屉实例
- ✅ getTopInstance() - 获取最顶层实例

**新增 API：**
```typescript
const drawer = useDrawer();

drawer.closeTop();                    // 关闭顶层
drawer.getInstances();                // 获取所有实例
drawer.getTopInstance();              // 获取顶层实例
```

### 🔧 改进

#### 1. 代码可读性
- 从 436 行的单文件拆分为多个模块
- TSX 语法使代码更直观
- 更好的代码组织和注释

#### 2. 类型安全
- 完善的 TypeScript 类型定义
- 更严格的类型检查
- 更好的 IDE 智能提示

#### 3. 性能优化
- 优化实例管理逻辑
- 使用 Map 和 Symbol 管理实例
- 更高效的嵌套层级管理

#### 4. 主题支持
- 移除冗余的主题配置
- 自动继承全局主题
- 更好的暗色模式支持

### 📝 文档

#### 新增文档
- ✅ README.md - 完整的使用文档
- ✅ MIGRATION.md - 详细的迁移指南
- ✅ CHANGELOG.md - 更新日志
- ✅ example.tsx - 丰富的使用示例

#### 文档内容
- 完整的 API 文档
- 详细的使用示例
- 常见问题解答
- 最佳实践指南

### 🔄 向后兼容

**✅ 完全向后兼容**
- 所有旧 API 都保留
- 旧代码无需修改即可运行
- 渐进式升级，无破坏性变更

### 📊 对比总结

| 特性 | 旧版本 | 新版本 |
|------|--------|--------|
| **语法** | render 函数 | TSX |
| **组件结构** | 内联定义 | 独立组件 |
| **文件数量** | 1 个 | 5 个 |
| **代码行数** | 436 行 | ~300 行（分散） |
| **嵌套支持** | ❌ | ✅ |
| **响应式状态** | ❌ | ✅ |
| **实例方法** | 3 个 | 9 个 |
| **管理器方法** | 3 个 | 6 个 |
| **类型安全** | 良好 | 优秀 |
| **可维护性** | 一般 | 优秀 |
| **文档完整度** | 基础 | 完善 |

### 🎯 使用示例

#### 基础使用
```typescript
const drawer = useDrawer();

drawer.open({
  title: '标题',
  content: '内容'
});
```

#### 响应式状态
```typescript
const instance = await drawer.open({ ... });

watch(instance.state.visible, (visible) => {
  console.log('可见性:', visible);
});
```

#### 手动控制
```typescript
const instance = await drawer.confirm({ ... });

instance.setLoading(true);
instance.setDisabled(true);
```

#### 嵌套抽屉
```typescript
const first = await drawer.open({ title: '第一层' });
const second = await drawer.open({ title: '第二层' });

drawer.closeTop(); // 关闭第二层
```

### 🚀 性能提升

- **代码体积**: 优化后整体代码更模块化
- **运行时性能**: 优化实例管理，减少不必要的计算
- **开发体验**: TSX 语法提升开发效率

### 🐛 Bug 修复

- 修复了主题配置可能导致的类型错误
- 优化了实例销毁逻辑，防止内存泄漏
- 改进了动画时序，避免闪烁

### 📦 依赖更新

无新增依赖，保持轻量级。

### 🔜 未来计划

- [ ] 添加单元测试
- [ ] 添加 E2E 测试
- [ ] 支持自定义动画
- [ ] 支持拖拽调整大小
- [ ] 添加更多预设样式

---

## v1.0.0 - 初始版本

### 特性
- 基础抽屉功能
- 确认/取消按钮
- 自定义按钮
- 生命周期钩子
- 主题支持

---

**完整文档**: [README.md](./README.md)  
**迁移指南**: [MIGRATION.md](./MIGRATION.md)  
**使用示例**: [example.tsx](./example.tsx)

