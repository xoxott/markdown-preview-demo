/**
 * DialogTestPanel - 弹窗测试面板
 * 用于测试所有弹窗功能
 */

import { defineComponent, PropType } from 'vue'
import { NButton, NSpace, NDivider, useThemeVars } from 'naive-ui'
import { UseDialogReturn } from '../hooks/useDialog'

export default defineComponent({
  name: 'DialogTestPanel',
  props: {
    dialog: {
      type: Object as PropType<UseDialogReturn>,
      required: true
    }
  },
  setup(props) {
    const themeVars = useThemeVars()

    // 测试重命名对话框
    const testRename = () => {
      props.dialog.rename({
        title: '重命名文件',
        defaultValue: 'test-file.txt',
        placeholder: '请输入新名称',
        onConfirm: async (newName) => {
          console.log('新名称:', newName)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      })
    }

    // 测试确认对话框
    const testConfirm = () => {
      props.dialog.confirm({
        title: '确认操作',
        content: '这是一个确认对话框,您确定要继续吗?',
        type: 'warning',
        onConfirm: async () => {
          console.log('用户确认了操作')
          await new Promise(resolve => setTimeout(resolve, 500))
        },
        onCancel: () => {
          console.log('用户取消了操作')
        }
      })
    }

    // 测试信息对话框
    const testInfo = () => {
      props.dialog.info('这是一条信息提示', '信息')
    }

    // 测试成功对话框
    const testSuccess = () => {
      props.dialog.success('操作已成功完成!', '成功')
    }

    // 测试警告对话框
    const testWarning = () => {
      props.dialog.warning('请注意这个警告信息!', '警告')
    }

    // 测试错误对话框
    const testError = () => {
      props.dialog.error('发生了一个错误!', '错误')
    }

    // 测试删除确认对话框
    const testConfirmDelete = () => {
      props.dialog.confirmDelete('重要文件.txt', async () => {
        console.log('文件已删除')
        await new Promise(resolve => setTimeout(resolve, 500))
      })
    }

    // 测试可拖拽弹窗
    const testDraggable = () => {
      props.dialog.confirm({
        title: '可拖拽弹窗',
        content: '尝试拖拽标题栏来移动这个弹窗!',
        type: 'info',
        onConfirm: () => {
          console.log('测试完成')
        }
      })
    }

    return () => (
      <div
        style={{
          padding: '20px',
          height: '100%',
          overflowY: 'auto',
          backgroundColor: themeVars.value.cardColor
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', color: themeVars.value.textColor1 }}>
          弹窗测试面板
        </h3>
        
        <NSpace vertical size="large">
          {/* 基础对话框 */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: themeVars.value.textColor2 }}>
              基础对话框
            </h4>
            <NSpace>
              <NButton onClick={testRename}>重命名对话框</NButton>
              <NButton onClick={testConfirm}>确认对话框</NButton>
            </NSpace>
          </div>

          <NDivider style={{ margin: '0' }} />

          {/* 消息对话框 */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: themeVars.value.textColor2 }}>
              消息对话框
            </h4>
            <NSpace>
              <NButton onClick={testInfo}>信息</NButton>
              <NButton onClick={testSuccess} type="success">成功</NButton>
              <NButton onClick={testWarning} type="warning">警告</NButton>
              <NButton onClick={testError} type="error">错误</NButton>
            </NSpace>
          </div>

          <NDivider style={{ margin: '0' }} />

          {/* 特殊对话框 */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: themeVars.value.textColor2 }}>
              特殊对话框
            </h4>
            <NSpace>
              <NButton onClick={testConfirmDelete} type="error">删除确认</NButton>
              <NButton onClick={testDraggable}>可拖拽弹窗</NButton>
            </NSpace>
          </div>

          <NDivider style={{ margin: '0' }} />

          {/* 使用说明 */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: themeVars.value.textColor2 }}>
              功能说明
            </h4>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px',
              color: themeVars.value.textColor3,
              fontSize: '14px',
              lineHeight: '1.8'
            }}>
              <li>所有弹窗都支持拖拽标题栏移动</li>
              <li>按 ESC 键可以关闭弹窗</li>
              <li>重命名对话框按 Enter 键确认</li>
              <li>点击遮罩层可以关闭弹窗</li>
              <li>支持暗色/亮色主题自动适配</li>
            </ul>
          </div>

          <NDivider style={{ margin: '0' }} />

          {/* 文件操作测试 */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: themeVars.value.textColor2 }}>
              文件操作测试
            </h4>
            <div style={{ 
              color: themeVars.value.textColor3,
              fontSize: '14px',
              lineHeight: '1.8'
            }}>
              <p style={{ margin: '0 0 8px 0' }}>
                在左侧文件列表中:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>选中文件后按 F2 或右键选择"重命名"</li>
                <li>选中文件后按 Delete 或右键选择"删除"</li>
                <li>右键空白处选择"新建文件夹"</li>
              </ul>
            </div>
          </div>
        </NSpace>
      </div>
    )
  }
})

