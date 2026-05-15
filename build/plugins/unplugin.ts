import process from 'node:process';
import path from 'node:path';
import type { PluginOption } from 'vite';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Components from 'unplugin-vue-components/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';

export function setupUnplugin(viteEnv: Env.ImportMeta) {
  const { VITE_ICON_PREFIX, VITE_ICON_LOCAL_PREFIX } = viteEnv;

  const localIconPath = path.join(process.cwd(), 'src/assets/svg-icon');

  /** The name of the local icon collection */
  const collectionName = VITE_ICON_LOCAL_PREFIX.replace(`${VITE_ICON_PREFIX}-`, '');

  const plugins: PluginOption[] = [
    Icons({
      compiler: 'vue3',
      customCollections: {
        [collectionName]: FileSystemIconLoader(localIconPath, svg =>
          svg.replace(/^<svg\s/, '<svg width="1em" height="1em" ')
        )
      },
      scale: 1,
      defaultClass: 'inline-block'
    }),
    Components({
      /**
       * 仅扫描通用组件根目录；不含 file-explorer（由页面显式 import）
       * 新增共享组件目录时请同步加入此列表
       */
      dirs: [
        'src/components/advanced',
        'src/components/ai-workflow',
        'src/components/base-dialog',
        'src/components/base-drawer',
        'src/components/clockLoading',
        'src/components/common-interaction',
        'src/components/common',
        'src/components/custom-upload',
        'src/components/custom',
        'src/components/declarative-form',
        'src/components/docviewer',
        'src/components/flow',
        'src/components/markdown',
        'src/components/mobile',
        'src/components/monaco',
        'src/components/monitoring',
        'src/components/streaming-pen-effect',
        'src/components/table-page'
      ],
      dts: 'src/typings/components.d.ts',
      extensions: ['vue', 'tsx'],
      types: [{ from: 'vue-router', names: ['RouterLink', 'RouterView'] }],
      resolvers: [
        NaiveUiResolver(),
        IconsResolver({ customCollections: [collectionName], componentPrefix: VITE_ICON_PREFIX })
      ]
    }),
    createSvgIconsPlugin({
      iconDirs: [localIconPath],
      symbolId: `${VITE_ICON_LOCAL_PREFIX}-[dir]-[name]`,
      inject: 'body-last',
      customDomId: '__SVG_ICON_LOCAL__'
    })
  ];

  return plugins;
}
