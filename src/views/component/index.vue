<!--
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-01 21:48:56
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-02 20:10:12
 * @FilePath: \markdown-preview-demo\src\views\component\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <n-card bordered>
    <n-h3 class="text-lg font-semibold border-b pb-2">
      组件示例:
    </n-h3>
    <n-form label-placement="left" :show-label="true">
      <n-form-item label="自定义上传组件" class="flex items-center">
        <custom-upload :multiple="true" :maxCount="5" :accept="'.png,.jpg,.jpeg,.gif'" @change="handleChange"
          abstract />
      </n-form-item>

      <n-form-item label="倒计时组件" class="flex items-center">
        <countdownTimer :seconds="35" label="预计剩余时间:" :showTrend="true" />
      </n-form-item>

      <n-form-item label="可编辑文本组件" class="flex items-center">
        <editableText value="可编辑内容" />
      </n-form-item>

      <n-form-item label="圈选组件" class="flex items-center">
        <SelectionRect>
          <div class="w-100 h-50 rounded border-2 border-dashed"></div>
        </SelectionRect>
      </n-form-item>

      <n-form-item label="右键菜单" class="flex items-center">
        <ContextMenu @select="handleSelect" triggerSelector="[data-selectable-id]" @hide="() => console.log('菜单隐藏')"
          @show="e => console.log('菜单显示', e)" :options="fileMenuOptions">
          <div class="flex gap-4">
            <div data-selectable-id="item-1">
              右键我试试1
            </div>
            <div data-selectable-id="item-1">
              右键我试试2
            </div>
          </div>
        </ContextMenu>
      </n-form-item>
    </n-form>

    <ViewContainer :files="files" :view-config="viewConfig"/>
  </n-card>
</template>

<script lang="ts" setup>
import customUpload from '@/components/CustomUpload'
import countdownTimer from '@/components/custom/countdown-timer.vue'
import editableText from '@/components/custom/editable-text.vue'
import SelectionRect from '@/components/file-explorer/interaction/SelectionRect'
import ContextMenu, { ContextMenuItem } from '@/components/file-explorer/interaction/ContextMenu'
import ViewContainer from '@/components/file-explorer/ViewContainer'
import { computed } from 'vue'
import {
  CopyOutline,
  CreateOutline,
  CutOutline,
  DownloadOutline,
  InformationCircleOutline,
  OpenOutline,
  ShareSocialOutline,
  StarOutline,
  TrashOutline
} from '@vicons/ionicons5'
import { FileItem, ViewConfig } from '@/components/file-explorer/types/file-explorer'

const viewConfig:ViewConfig = {
  mode:'grid',
  sortField:'name',
  sortOrder:'desc',
  // showHidden:true
}

const files:FileItem[] = [
 {
   id:'file-id',
   name:'file-name',
   type:'folder',
   size:128
 }
]

const fileMenuOptions = computed<ContextMenuItem[]>(() => {
  const isMultiple = true // 示例中假设为多选状态
  return [
    {
      key: 'open',
      label: '打开',
      icon: OpenOutline,
      // show: !isMultiple && props.fileType !== 'empty',
      show: true,
      shortcut: 'Enter'
    },
    {
      key: 'open-with',
      label: '打开方式',
      icon: OpenOutline,
      show: true,
      // show: !isMultiple && props.fileType === 'file',
      children: [
        { key: 'open-default', label: '默认程序' },
        { key: 'open-text', label: '文本编辑器' },
        { key: 'open-code', label: '代码编辑器' }
      ]
    },
    {
      key: 'divider-1',
      label: '',
      divider: true,
      show: true,
      // show: props.fileType !== 'empty'
    },
    {
      key: 'cut',
      label: '剪切',
      icon: CutOutline,
      // show: props.fileType !== 'empty',
      shortcut: 'Ctrl+X'
    },
    {
      key: 'copy',
      label: '复制',
      icon: CopyOutline,
      // show: props.fileType !== 'empty',
      shortcut: 'Ctrl+C'
    },
    {
      key: 'paste',
      label: '粘贴',
      icon: CopyOutline,
      shortcut: 'Ctrl+V'
    },
    {
      key: 'divider-2',
      label: '',
      divider: true
    },
    {
      key: 'rename',
      label: '重命名',
      icon: CreateOutline,
      // show: !isMultiple && props.fileType !== 'empty',
      shortcut: 'F2'
    },
    {
      key: 'delete',
      // label: isMultiple ? `删除 ${props.selectedCount} 项` : '删除',
      label: '删除',
      icon: TrashOutline,
      // show: props.fileType !== 'empty',
      danger: true,
      shortcut: 'Delete'
    },
    {
      key: 'divider-3',
      label: '',
      divider: true,
      // show: props.fileType !== 'empty'
    },
    {
      key: 'download',
      label: '下载',
      icon: DownloadOutline,
      // show: props.fileType !== 'empty'
    },
    {
      key: 'share',
      label: '分享',
      icon: ShareSocialOutline,
      // show: props.fileType !== 'empty'
    },
    {
      key: 'favorite',
      label: '收藏',
      icon: StarOutline,
      // show: !isMultiple && props.fileType !== 'empty'
    },
    {
      key: 'divider-4',
      label: '',
      divider: true,
      // show: props.fileType !== 'empty'
    },
    {
      key: 'properties',
      label: '属性',
      icon: InformationCircleOutline,
      // show: !isMultiple && props.fileType !== 'empty',
      shortcut: 'Alt+Enter'
    },
    {
      key: 'new-folder',
      label: '新建文件夹',
      icon: CreateOutline,
      // show: props.fileType === 'empty',
      shortcut: 'Ctrl+Shift+N'
    }
  ]
})

const handleChange = (files: File[]) => {
  console.log('上传的文件:', files)
}

const handleSelect = (key: string) => {
  console.log('选择的菜单项:', key)
}
</script>
