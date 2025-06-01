/* eslint-disable max-params */
/* eslint-disable no-plusplus */
import type { Component, VNode } from 'vue';
import { Comment, Fragment, Text, createVNode, defineAsyncComponent } from 'vue';
import type { Renderer, Token } from 'markdown-it';
import type MarkdownIt from 'markdown-it';
import { v4 as uuid } from 'uuid';

interface CodeBlockMeta {
  langName: string;
  content: string;
  attrs: Record<string, string>;
  info: string;
  token: Token;
}
type VueMarkdownPluginOptions = {
  components?: {
    codeBlock?: (meta: CodeBlockMeta) => Component | null;
  };
};
// 安全检测正则表达式
const sensitiveUrlReg = /^javascript:|vbscript:|file:/i;
const sensitiveAttrReg = /^href|src|xlink:href|poster|srcset$/i;
const attrNameReg = /^[a-zA-Z_:][a-zA-Z0-9:._-]*$/;
const attrEventReg = /^on/i;
const defaultRules = {
  options: null
} as any;

const DOM_ATTR_NAME = {
  /** 源代码起始行号 (1-based) */
  SOURCE_LINE_START: 'data-source-line-start',

  /** 源代码结束行号 (1-based) */
  SOURCE_LINE_END: 'data-source-line-end',

  /** 原始未处理内容 */
  ORIGIN_CONTENT: 'data-origin-content',

  /** 语法块类型标识 */
  SYNTAX_TYPE: 'data-syntax-type',

  /** Token 索引标识 */
  TOKEN_IDX: 'data-token-idx',

  /** 代码块语言类型 */
  CODE_LANG: 'data-code-lang',

  /** 是否折叠状态 */
  COLLAPSE_STATE: 'data-collapse-state',

  /** 安全渲染标识 */
  SANITIZED: 'data-sanitized'
} as const;

/**
 * HTML 转义工具
 *
 * @param str - 原始字符串
 * @returns 转义后的字符串
 */
export function escapeHtml(str: string): string {
  return str.replace(
    /[&<>"']/g,
    match =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[match] || match
  );
}

/**
 * 反转义 HTML（等同于原 markdown-it 的 unescapeAll）
 *
 * @param str - 转义后的字符串
 * @returns 原始字符串
 */
export function unescapeAll(str: string): string {
  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
  };
  return str.replace(/&(amp|lt|gt|quot|#39);/g, (_, code) => htmlUnescapes[`&${code};`] || _);
}

/**
 * 处理画中画模式离开事件
 *
 * @param e - 事件对象
 */
function onLeavepictureinpicture(e: Event) {
  const target = e.target as HTMLMediaElement;
  if (!target.isConnected) {
    target.pause();
  } else {
    (target as any).scrollIntoViewIfNeeded();
  }
}

/**
 * 验证属性名称合法性
 *
 * @param name - 属性名称
 * @returns 是否合法
 */
function validateAttrName(name: string) {
  return attrNameReg.test(name) && !attrEventReg.test(name);
}

/**
 * 获取Token对应的源码行号范围
 *
 * @param token - Markdown Token
 * @param env - 渲染环境变量
 * @returns {undefined} 起始行号, 结束行号
 */
function getLine(token: Token, env?: Record<string, any>): [number, number] {
  const [lineStart, lineEnd] = token.map || [0, 1];
  let sOffset = 0;

  if (env?.macroLines && env.bMarks && env.eMarks) {
    const sPos = env.bMarks[lineStart];
    for (const { matchPos, lineOffset, posOffset, currentPosOffset } of env.macroLines) {
      if (sPos + posOffset > matchPos && sPos + posOffset - currentPosOffset > matchPos) {
        sOffset = lineOffset;
      } else {
        break;
      }
    }
  }

  return [lineStart + sOffset, lineEnd + sOffset];
}

/**
 * 判断是否为组件选项
 *
 * @param obj
 * @returns
 */
function isComponentOptions(obj: any): obj is Component {
  return typeof obj === 'object' && ('setup' in obj || 'render' in obj || 'template' in obj);
}

/**
 * 创建HTML内容的VNode
 *
 * @param html - HTML字符串
 * @returns 对应的VNode
 */
const createHtmlVNode = (html: string) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  const elements = template.content.children;
  const children = [];
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const tagName = element.tagName.toLowerCase();
    const attrs: Record<string, any> = {
      key: element.outerHTML
    };

    for (let j = 0; j < element.attributes.length; j++) {
      const attr = element.attributes[j];
      attrs[attr.name] = attr.value;
    }

    attrs.innerHTML = element.innerHTML;
    attrs.key = element.innerHTML;

    children.push(createVNode(tagName, attrs, []));
  }

  return createVNode(Fragment, {}, children);
};

/**
 * 预处理Token
 *
 * @param token - 需要处理的Token
 * @param env - 渲染环境变量
 */
function processToken(token: Token, env?: Record<string, any>) {
  if (!token.meta) {
    token.meta = {};
  }
  // 安全模式处理
  if (env?.safeMode) {
    token.attrs?.forEach(([name, val]) => {
      // eslint-disable-next-line no-param-reassign
      name = name.toLowerCase();
      if (sensitiveAttrReg.test(name) && sensitiveUrlReg.test(val)) {
        token.attrSet(name, '');
      }

      if (name === 'href' && val.toLowerCase().startsWith('data:')) {
        token.attrSet(name, '');
      }
    });
  }
  // 块级元素处理
  if (token.block) {
    const [lineStart, lineEnd] = getLine(token, env);

    if (token.map) {
      token.attrSet(DOM_ATTR_NAME.SOURCE_LINE_START, String(lineStart + 1));
      token.attrSet(DOM_ATTR_NAME.SOURCE_LINE_END, String(lineEnd + 1));
      if (!token.meta.attrs) {
        token.meta.attrs = {};
      }

      // 转换属性数组为对象
      token.attrs?.forEach(([name, val]) => {
        token.meta.attrs[name] = val;
      });
    }
  }
}

/** 行内代码渲染规则 */
defaultRules.code_inline = (tokens: Token[], idx: number, _: any, __: any, slf: Renderer) => {
  const token = tokens[idx];
  return createVNode('code', slf.renderAttrs(token) as any, token.content);
};

/** 代码块渲染规则 */
defaultRules.code_block = (tokens: Token[], idx: number, _: any, __: any, slf: Renderer) => {
  const token = tokens[idx];
  const originalAttrs: any = slf.renderAttrs(token);
  const { [DOM_ATTR_NAME.SOURCE_LINE_START]: ___, [DOM_ATTR_NAME.SOURCE_LINE_END]: ____, ...safeAttrs } = originalAttrs;
  const preAttrs = {
    [DOM_ATTR_NAME.SOURCE_LINE_START]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_START],
    [DOM_ATTR_NAME.SOURCE_LINE_END]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_END]
  };
  return createVNode('pre', preAttrs, [createVNode('code', safeAttrs, [createVNode(Text, {}, token.content)])]);
};

/** 代码块渲染规则 */
defaultRules.fence = (tokens: Token[], idx: number, options: any, _: any, slf: Renderer) => {
  const token = tokens[idx];
  const info = token.info ? unescapeAll(token.info).trim() : '';
  const [langName = '', langAttrs = ''] = info.split(/\s+/, 2);
  const content = token.content;
  // 构造元数据
  const meta: CodeBlockMeta = {
    langName,
    content,
    attrs: Object.fromEntries(token.attrs || []),
    info,
    token
  };
  const defaultRender = () => {
    const originalAttrs = slf.renderAttrs(token) as unknown as Record<string, string>;
    const { [DOM_ATTR_NAME.SOURCE_LINE_START]: ___, [DOM_ATTR_NAME.SOURCE_LINE_END]: __, ...safeAttrs } = originalAttrs;
    let highlighted = escapeHtml(token.content);
    const classList = new Set(
      (safeAttrs.class?.split(/\s+/) || []).concat(langName ? `${options.langPrefix}${langName}` : [])
    );
    safeAttrs.class = Array.from(classList).join(' ');
    // 代码高亮
    if (typeof options.highlight === 'function') {
      highlighted = options.highlight(token.content, langName, langAttrs) || escapeHtml(token.content);
    } else {
      highlighted = escapeHtml(token.content);
    }
    // 输入pre标签添加换行
    if (highlighted.indexOf('<pre') === 0) {
      return `${highlighted}\n`;
    }
    return createVNode(
      'pre',
      {
        'data-info': info,
        'data-lang': langName,
        [DOM_ATTR_NAME.SOURCE_LINE_START]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_START],
        [DOM_ATTR_NAME.SOURCE_LINE_END]: originalAttrs[DOM_ATTR_NAME.SOURCE_LINE_END]
      },
      [
        createVNode(
          'code',
          {
            ...safeAttrs,
            innerHTML: highlighted
          },
          []
        )
      ]
    );
  };
  // 自定义组件
  const customComponent = defaultRules.options.component?.codeBlock?.(meta);
  if (customComponent) {
    try {
      let component: Component | Promise<Component> | null = null;
      // Promise（动态导入）
      if (customComponent instanceof Promise) {
        component = defineAsyncComponent({
          loader: () => customComponent.then(m => m.default || m),
          loadingComponent: createVNode('div', { class: 'loading' }, 'Loading...'),
          delay: 500,
          suspensible: true,
          timeout: 3000,
          onError: () => defaultRender() // 失败时回退
        });
        // 返回的是组件工厂函数
      } else if (typeof customComponent === 'function') {
        component = customComponent(meta);
        // 组件选项/构造函数
      } else if (isComponentOptions(customComponent)) {
        component = customComponent;
      }
      // 确保 component 已初始化
      if (!component) {
        throw new Error('Invalid component type');
      }
      return createVNode(component, {
        key: `${langName}-${uuid}`,
        meta,
        class: 'code-block-transition',
        onRenderFallback: () => defaultRender()
      });
    } catch (err) {
      console.error('自定义组件渲染失败, 回退默认:', err);
      return defaultRender();
    }
  }
  return defaultRender();
};

/** 图片处理 */
defaultRules.image = (tokens: Token[], idx: number, options: any, env: any, slf: Renderer) => {
  const token = tokens[idx];

  return createVNode(
    'img',
    {
      ...(slf.renderAttrs(token) as any),
      alt: slf.renderInlineAsText(token.children || [], options, env)
    },
    []
  );
};

/** 媒体处理 */
defaultRules.media = (tokens: Token[], idx: number, _options: any, _env: any, slf: Renderer) => {
  const token = tokens[idx];
  return createVNode(
    token.tag,
    {
      controlsList: 'nodownload',
      controls: true,
      onLeavepictureinpicture,
      ...(slf.renderAttrs(token) as any)
    },
    []
  );
};

/** 换行处理 */
defaultRules.hardbreak = () => createVNode('br');

/** 软换行处理 */
defaultRules.softbreak = (_: Token[], __: number, options: any) => (options.breaks ? createVNode('br') : null);

/** 文本处理 */
defaultRules.text = (tokens: Token[], idx: number) => createVNode(Text, {}, tokens[idx].content);

/** HTML块处理 */
defaultRules.html_block = (tokens: Token[], idx: number) => {
  const token = tokens[idx] as any;
  if (token.contentVNode) {
    return token.contentVNode;
  }

  return createHtmlVNode(token.content);
};

/** HTML行内处理 */
defaultRules.html_inline = (tokens: Token[], idx: number) => {
  const token = tokens[idx] as any;
  if (token.contentVNode) {
    return token.contentVNode;
  }

  return createHtmlVNode(token.content);
};

/** 渲染Token主要逻辑 */
function renderToken(this: Renderer, tokens: Token[], idx: number): any {
  const token = tokens[idx];

  if (token.nesting === -1) {
    return null;
  }

  // Tight list paragraphs
  if (token.hidden) {
    return createVNode(Fragment, {}, []);
  }

  if (token.tag === '--') {
    return createVNode(Comment);
  }

  return createVNode(token.tag, this.renderAttrs(token) as any, []);
}

/** 渲染Token属性 */
function renderAttrs(this: Renderer, token: Token) {
  if (!token.attrs) {
    return {};
  }

  const result: any = {};

  // eslint-disable-next-line @typescript-eslint/no-shadow
  token.attrs.forEach(token => {
    if (validateAttrName(token[0])) {
      result[token[0]] = token[1];
    }
  });

  return result;
}

/** 渲染Token主要逻辑 */
function render(this: Renderer, tokens: Token[], options: any, env: any) {
  const rules: any = this.rules;

  const vNodeParents: VNode[] = [];

  return tokens
    .map((token, i) => {
      processToken(token, env);
      if (token.block) {
        token.attrSet(DOM_ATTR_NAME.TOKEN_IDX, i.toString());
      }

      const type = token.type;

      let vnode: VNode | null = null;
      let parent: VNode | null = null;

      if (type === 'inline') {
        vnode = createVNode(Fragment, {}, this.render(token.children || [], options, env));
      } else if (rules[type]) {
        const result = rules[type](tokens, i, options, env, this);
        if (typeof result === 'string') {
          vnode = createHtmlVNode(result);
        } else if (result && result.node && result.parent) {
          parent = result.parent;
          vnode = result.node;
        } else {
          vnode = result;
        }
      } else {
        vnode = this.renderToken(tokens, i, options) as any;
      }

      let isChild = false;
      const parentNode = vNodeParents.length > 0 ? vNodeParents[vNodeParents.length - 1] : null;
      if (vnode && parentNode) {
        if (typeof parentNode.type === 'string' || parentNode.type === Fragment) {
          const children = Array.isArray(parentNode.children) ? parentNode.children : [];
          parentNode.children = children.concat([vnode]);
        }
        isChild = true;
      }

      if (token.nesting === 1) {
        if (parent) {
          vNodeParents.push(parent);
        } else if (vnode) {
          vNodeParents.push(vnode);
        }
      }

      if (token.nesting === -1) {
        vNodeParents.pop();
      }

      return isChild ? null : vnode;
    })
    .filter(node => Boolean(node)) as any;
}

const MarkdownVuePlugin = (md: MarkdownIt, options: VueMarkdownPluginOptions) => {
  defaultRules.options = options;
  Object.assign(md.renderer.rules, defaultRules);
  md.renderer.render = render;
  md.renderer.renderInline = render;
  md.renderer.renderAttrs = renderAttrs;
  md.renderer.renderToken = renderToken;
};
export default MarkdownVuePlugin;
