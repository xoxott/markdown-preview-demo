import { DOM_ATTR_NAME } from './constant'
import { MarkdownUtils } from './MarkdownUtils'
import { v4 as uuid } from 'uuid';
import type { FrameworkAdapter,UniversalMarkdownPluginOptions,ComponentMeta } from './FrameworkAdapter.ts'
import type { Token } from 'markdown-it';
// 渲染器工厂类
export class RendererFactory {
  private adapter: FrameworkAdapter;
  private options: UniversalMarkdownPluginOptions;

  constructor(adapter: FrameworkAdapter, options: UniversalMarkdownPluginOptions) {
    this.adapter = adapter;
    this.options = options;
  }

  createRenderRules() {
    const rules: Record<string, any> = {};

    // 行内代码
    rules.code_inline = (tokens: Token[], idx: number, _: any, __: any, slf: any) => {
      const token = tokens[idx];
      return this.adapter.createVNode('code', slf.renderAttrs(token), token.content);
    };

    // 代码块
    rules.code_block = (tokens: Token[], idx: number, _: any, __: any, slf: any) => {
      const token = tokens[idx];
      const attrs = slf.renderAttrs(token);
      const { [DOM_ATTR_NAME.SOURCE_LINE_START]: start, [DOM_ATTR_NAME.SOURCE_LINE_END]: end, ...safeAttrs } = attrs;
      
      const preAttrs = {
        [DOM_ATTR_NAME.SOURCE_LINE_START]: start,
        [DOM_ATTR_NAME.SOURCE_LINE_END]: end
      };

      return this.adapter.createVNode('pre', preAttrs, [
        this.adapter.createVNode('code', safeAttrs, [
          this.adapter.createTextNode(token.content)
        ])
      ]);
    };

    // 代码围栏
    rules.fence = (tokens: Token[], idx: number, options: any, _: any, slf: any) => {
      const token = tokens[idx];
      const info = token.info ? MarkdownUtils.unescapeAll(token.info).trim() : '';
      const [langName = '', langAttrs = ''] = info.split(/\s+/, 2);

      const meta: ComponentMeta = {
        langName,
        content: token.content,
        attrs: Object.fromEntries(token.attrs || []),
        info,
        token
      };

      return this.renderCodeBlock(meta, tokens, idx, options, slf);
    };

    // 图片
    rules.image = (tokens: Token[], idx: number, options: any, env: any, slf: any) => {
      const token = tokens[idx];
      const attrs = {
        ...slf.renderAttrs(token),
        alt: slf.renderInlineAsText(token.children || [], options, env)
      };
      return this.adapter.createVNode('img', attrs);
    };

    // 媒体
    rules.media = (tokens: Token[], idx: number, _: any, __: any, slf: any) => {
      const token = tokens[idx];
      const attrs = {
        controlsList: 'nodownload',
        controls: true,
        onLeavepictureinpicture: this.handlePictureInPictureLeave,
        ...slf.renderAttrs(token)
      };
      return this.adapter.createVNode(token.tag, attrs);
    };

    // 换行处理
    rules.hardbreak = () => this.adapter.createVNode('br');
    rules.softbreak = (_: Token[], __: number, options: any) => 
      options.breaks ? this.adapter.createVNode('br') : null;

    // 文本处理
    rules.text = (tokens: Token[], idx: number) => 
      this.adapter.createTextNode(tokens[idx].content);

    // HTML 处理
    rules.html_block = (tokens: Token[], idx: number) => {
      const token = tokens[idx] as any;
      return token.contentVNode || this.adapter.createHtmlNode(token.content);
    };

    rules.html_inline = (tokens: Token[], idx: number) => {
      const token = tokens[idx] as any;
      return token.contentVNode || this.adapter.createHtmlNode(token.content);
    };

    return rules;
  }

  private renderCodeBlock(meta: ComponentMeta, tokens: Token[], idx: number, options: any, slf: any) {
    const { langName, content, info, token } = meta;

    // 默认渲染函数
    const defaultRender = () => {
      const attrs = slf.renderAttrs(token);
      const { [DOM_ATTR_NAME.SOURCE_LINE_START]: start, [DOM_ATTR_NAME.SOURCE_LINE_END]: end, ...safeAttrs } = attrs;
      
      let highlighted = MarkdownUtils.escapeHtml(content);
      const classList = new Set(
        (safeAttrs.class?.split(/\s+/) || []).concat(
          langName ? `${options.langPrefix || 'language-'}${langName}` : []
        )
      );
      safeAttrs.class = Array.from(classList).join(' ');

      // 代码高亮
      if (typeof this.options.highlight === 'function') {
        highlighted = this.options.highlight(content, langName, '') || MarkdownUtils.escapeHtml(content);
      }

      // 如果高亮结果包含 pre 标签，直接返回
      if (highlighted.indexOf('<pre') === 0) {
        return this.adapter.createHtmlNode(`${highlighted}\n`);
      }

      const preProps = {
        'data-info': info,
        'data-lang': langName,
        [DOM_ATTR_NAME.SOURCE_LINE_START]: start,
        [DOM_ATTR_NAME.SOURCE_LINE_END]: end
      };

      const codeProps = {
        ...safeAttrs,
        innerHTML: highlighted
      };

      return this.adapter.createVNode('pre', preProps, [
        this.adapter.createVNode('code', codeProps)
      ]);
    };

    // 自定义组件处理
    const customComponent = this.options.components?.codeBlock?.(meta);
    if (customComponent) {
      try {
        return this.handleCustomComponent(customComponent, meta, defaultRender);
      } catch (err) {
        console.error('Custom component render failed, fallback to default:', err);
        return defaultRender();
      }
    }

    return defaultRender();
  }

  private handleCustomComponent(customComponent: any, meta: ComponentMeta, fallback: () => any) {
    const props = {
      key: `${meta.langName}-${uuid()}`,
      meta,
      class: 'code-block-transition',
      onRenderFallback: fallback
    };

    if (customComponent instanceof Promise) {
      return this.adapter.defineAsyncComponent?.(
        () => customComponent.then(m => m.default || m),
        { onError: fallback }
      );
    }

    if (typeof customComponent === 'function') {
      return this.adapter.createVNode(customComponent, props);
    }

    if (typeof customComponent === 'object' && customComponent !== null) {
      return this.adapter.createVNode(customComponent, props);
    }

    throw new Error('Invalid component type');
  }

  private handlePictureInPictureLeave(e: Event) {
    const target = e.target as HTMLMediaElement;
    if (!target.isConnected) {
      target.pause();
    } else {
      (target as any).scrollIntoViewIfNeeded?.();
    }
  }
}
