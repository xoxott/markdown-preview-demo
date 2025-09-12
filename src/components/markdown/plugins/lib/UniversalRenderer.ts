import type { Token } from "markdown-it";
import { FrameworkAdapter, UniversalMarkdownPluginOptions } from "./FrameworkAdapter";
import { RendererFactory } from "./RendererFactory";
import { MarkdownUtils } from "./MarkdownUtils";
import { DOM_ATTR_NAME } from "./constant";

// 渲染器类
export class UniversalRenderer {
  private adapter: FrameworkAdapter;
  private options: UniversalMarkdownPluginOptions;
  public factory: RendererFactory;

  constructor(adapter: FrameworkAdapter, options: UniversalMarkdownPluginOptions) {
    this.adapter = adapter;
    this.options = options;
    this.factory = new RendererFactory(adapter, options);
  }

  processToken(token: Token, env?: Record<string, any>) {
    if (!token.meta) {
      token.meta = {};
    }

    // 安全模式处理
    MarkdownUtils.sanitizeAttributes(token, this.options.safeMode);

    // 块级元素处理
    if (token.block && token.map) {
      const [lineStart, lineEnd] = MarkdownUtils.getSourceLineRange(token, env);
      token.attrSet(DOM_ATTR_NAME.SOURCE_LINE_START, String(lineStart + 1));
      token.attrSet(DOM_ATTR_NAME.SOURCE_LINE_END, String(lineEnd + 1));

      if (!token.meta.attrs) {
        token.meta.attrs = {};
      }

      token.attrs?.forEach(([name, val]) => {
        token.meta.attrs[name] = val;
      });
    }
  }

  renderToken(tokens: Token[], idx: number): any {
    const token = tokens[idx];

    if (token.nesting === -1) {
      return null;
    }

    if (token.hidden) {
      return this.adapter.createFragment([]);
    }

    if (token.tag === '--') {
      return this.adapter.createComment();
    }

    // 使用内部的 renderAttrs 方法获取对象格式的属性
    return this.adapter.createVNode(token.tag, this.renderAttrs(token));
  }

  renderAttrs(token: Token): Record<string, any> {
    if (!token.attrs) {
      return {};
    }

    const result: any = {};
    token.attrs.forEach(([name, value]) => {
      if (MarkdownUtils.validateAttrName(name)) {
        result[name] = value;
      }
    });

    return result;
  }

  render(tokens: Token[], options: any, env: any): any {
    const rules = this.factory.createRenderRules();
    const vNodeParents: any[] = [];

    return tokens
      .map((token, i) => {
        this.processToken(token, env);
        
        if (token.block) {
          token.attrSet(DOM_ATTR_NAME.TOKEN_IDX, i.toString());
        }

        const type = token.type;
        let vnode: any = null;
        let parent: any = null;

        if (type === 'inline') {
          vnode = this.adapter.createFragment(this.render(token.children || [], options, env));
        } else if (rules[type]) {
          const result = rules[type](tokens, i, options, env, this);
          if (typeof result === 'string') {
            vnode = this.adapter.createHtmlNode(result);
          } else if (result && result.node && result.parent) {
            parent = result.parent;
            vnode = result.node;
          } else {
            vnode = result;
          }
        } else {
          vnode = this.renderToken(tokens, i);
        }

        let isChild = false;
        const parentNode = vNodeParents.length > 0 ? vNodeParents[vNodeParents.length - 1] : null;
        
        if (vnode && parentNode) {
          if (typeof parentNode.type === 'string' || parentNode.type === this.adapter.createFragment) {
            const children = Array.isArray(parentNode.children) ? parentNode.children : [];
            parentNode.children = children.concat([vnode]);
          }
          isChild = true;
        }

        if (token.nesting === 1) {
          vNodeParents.push(parent || vnode);
        }

        if (token.nesting === -1) {
          vNodeParents.pop();
        }

        return isChild ? null : vnode;
      })
      .filter(Boolean);
  }
}