# @suga/markdown-it-render-vnode-vue

Vue adapter for `@suga/markdown-it-render-vnode`.

## Installation

```bash
npm install @suga/markdown-it-render-vnode-vue @suga/markdown-it-render-vnode vue
```

## Usage

```typescript
import MarkdownIt from 'markdown-it';
import markdownItRenderVnode from '@suga/markdown-it-render-vnode';
import { vueAdapter } from '@suga/markdown-it-render-vnode-vue';

const md = new MarkdownIt();
md.use(markdownItRenderVnode, { adapter: vueAdapter });
```

## License

MIT
