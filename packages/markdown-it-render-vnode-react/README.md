# @suga/markdown-it-render-vnode-react

React adapter for `@suga/markdown-it-render-vnode`.

## Installation

```bash
npm install @suga/markdown-it-render-vnode-react @suga/markdown-it-render-vnode react
```

## Usage

```typescript
import MarkdownIt from 'markdown-it';
import markdownItRenderVnode from '@suga/markdown-it-render-vnode';
import { reactAdapter } from '@suga/markdown-it-render-vnode-react';

const md = new MarkdownIt();
md.use(markdownItRenderVnode, { adapter: reactAdapter });
```

## License

MIT
