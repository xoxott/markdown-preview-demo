/** useDrawer 使用示例 展示优化后的新特性 */

import { defineComponent, ref, watch } from 'vue';
import { NButton, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import useDrawer from './useDrawer';

export default defineComponent({
  name: 'DrawerExample',
  setup() {
    const drawer = useDrawer();
    const formData = ref({ name: '', email: '' });

    // 示例1: 基础抽屉
    const openBasicDrawer = () => {
      drawer.open({
        title: '基础抽屉',
        content: '这是一个基础抽屉示例',
        width: 500
      });
    };

    // 示例2: 确认抽屉
    const openConfirmDrawer = async () => {
      const instance = await drawer.confirm({
        title: '确认操作',
        content: '确定要执行此操作吗？',
        onConfirm: async () => {
          // 模拟异步操作
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('操作已确认');
        }
      });

      // 可以访问响应式状态
      console.log('抽屉是否可见:', instance.state.visible.value);
    };

    // 示例3: 带表单的抽屉（手动控制 loading）
    const openFormDrawer = async () => {
      const instance = await drawer.confirm({
        title: '编辑信息',
        content: () => (
          <NForm model={formData.value}>
            <NFormItem label="姓名" path="name">
              <NInput v-model:value={formData.value.name} placeholder="请输入姓名" />
            </NFormItem>
            <NFormItem label="邮箱" path="email">
              <NInput v-model:value={formData.value.email} placeholder="请输入邮箱" />
            </NFormItem>
          </NForm>
        ),
        width: 600,
        onConfirm: async () => {
          // 手动控制 loading 状态
          instance.setLoading(true);
          try {
            // 模拟提交
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('表单提交成功:', formData.value);
          } finally {
            instance.setLoading(false);
          }
        }
      });
    };

    // 示例4: 嵌套抽屉
    const openNestedDrawer = async () => {
      await drawer.open({
        title: '第一层抽屉',
        content: () => (
          <div>
            <p>这是第一层抽屉</p>
            <NButton onClick={openSecondDrawer}>打开第二层抽屉</NButton>
          </div>
        ),
        width: 500
      });
    };
    const openSecondDrawer = async () => {
      const secondDrawer = await drawer.open({
        title: '第二层抽屉',
        content: () => (
          <div>
            <p>这是第二层抽屉</p>
            <NButton onClick={openThirdDrawer}>打开第三层抽屉</NButton>
          </div>
        ),
        width: 450,
        placement: 'right'
      });
    };

    const openThirdDrawer = () => {
      drawer.info({
        title: '第三层抽屉',
        content: '这是第三层抽屉，支持无限嵌套！',
        width: 400
      });
    };

    // 示例5: 自定义按钮
    const openCustomButtonDrawer = () => {
      drawer.open({
        title: '自定义按钮',
        content: '这个抽屉有自定义按钮',
        showFooter: true,
        customButtons: [
          {
            text: '保存草稿',
            type: 'default',
            onClick: async () => {
              console.log('保存草稿');
            }
          },
          {
            text: '预览',
            type: 'info',
            onClick: async () => {
              console.log('预览');
            }
          }
        ],
        confirmButton: { text: '发布', type: 'primary' },
        cancelButton: { text: '取消', type: 'default' }
      });
    };

    // 示例6: 响应式状态监听
    const openWithStateMonitor = async () => {
      const instance = await drawer.confirm({
        title: '状态监听示例',
        content: '可以监听抽屉的响应式状态',
        onConfirm: async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      });

      // 监听状态变化
      watch(instance.state.visible, (visible: boolean) => {
        console.log('抽屉可见性变化:', visible);
      });

      watch(instance.state.loading, (loading: boolean) => {
        console.log('加载状态变化:', loading);
      });
    };

    // 示例7: 管理器方法
    const managerDemo = () => {
      console.log('当前抽屉数量:', drawer.getCount());
      console.log('所有抽屉实例:', drawer.getInstances());
      console.log('最顶层抽屉:', drawer.getTopInstance());

      // 关闭最顶层的抽屉
      // drawer.closeTop();

      // 关闭所有抽屉
      // drawer.closeAll();

      // 销毁所有抽屉
      // drawer.destroyAll();
    };

    return () => (
      <div style={{ padding: '20px' }}>
        <NSpace vertical size="large">
          <h2>useDrawer 使用示例</h2>

          <NSpace>
            <NButton onClick={openBasicDrawer}>基础抽屉</NButton>
            <NButton onClick={openConfirmDrawer}>确认抽屉</NButton>
            <NButton onClick={openFormDrawer}>表单抽屉</NButton>
          </NSpace>

          <NSpace>
            <NButton onClick={openNestedDrawer}>嵌套抽屉</NButton>
            <NButton onClick={openCustomButtonDrawer}>自定义按钮</NButton>
            <NButton onClick={openWithStateMonitor}>状态监听</NButton>
          </NSpace>

          <NSpace>
            <NButton onClick={managerDemo}>管理器方法</NButton>
            <NButton onClick={() => drawer.closeTop()}>关闭顶层</NButton>
            <NButton onClick={() => drawer.closeAll()}>关闭所有</NButton>
          </NSpace>
        </NSpace>
      </div>
    );
  }
});
