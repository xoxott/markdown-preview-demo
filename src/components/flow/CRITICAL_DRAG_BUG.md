# 🚨 严重拖拽性能 Bug

## 问题

**优化后反而更卡顿了！**

## 根本原因

在 `FlowCanvas.tsx` 中，拖拽更新代码有严重的性能问题：

```typescript
// line 574 - ❌ 严重问题
nodes.value = [...nodes.value];
```

这行代码会触发：

```typescript
// line 127 - watch 被触发
watch(
  () => nodes.value,
  (newNodes) => {
    // ❌ 每次拖拽都重新创建 Map（200 个节点）
    const newMap = new Map<string, FlowNode>();
    for (let i = 0; i < newNodes.length; i++) {
      newMap.set(newNodes[i].id, newNodes[i]);
    }
    nodesMap.value = newMap;
  }
);
```

**性能影响**:
- 每次拖拽 → 重建 Map (200 次操作)
- 触发 FlowNodes 重新渲染
- 比优化前更慢！

## 解决方案

**不要触发 nodes.value 的更新，直接修改节点对象即可**

```typescript
// ✅ 正确做法
updateRafId = requestAnimationFrame(() => {
  if (pendingNodeUpdate) {
    const updateNode = nodesMap.value.get(pendingNodeUpdate.nodeId);
    if (updateNode) {
      // ✅ 直接修改节点对象
      updateNode.position.x = pendingNodeUpdate.x;
      updateNode.position.y = pendingNodeUpdate.y;
      
      // ❌ 删除这行！不要触发数组更新
      // nodes.value = [...nodes.value];
    }
    pendingNodeUpdate = null;
  }
  updateRafId = null;
});
```

但这样会导致视图不更新！需要另一个方案：

**使用版本号强制更新**

```typescript
const nodesVersion = ref(0);

// 拖拽时直接修改，不触发 watch
updateNode.position.x = pendingNodeUpdate.x;
updateNode.position.y = pendingNodeUpdate.y;

// 手动触发版本号更新
nodesVersion.value++;

// FlowNodes 监听版本号
watch(() => props.nodesVersion, () => {
  // 强制重新渲染
});
```

## 立即修复

需要回滚优化，使用更简单的方案。

