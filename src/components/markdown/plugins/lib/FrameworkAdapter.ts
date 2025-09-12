import type { Token } from 'markdown-it';
import { v4 as uuid } from 'uuid';
// 框架类型枚举
export enum FrameworkType {
  VUE = 'vue',
  REACT = 'react'
}

// 通用组件接口
export interface ComponentMeta {
  langName: string;
  content: string;
  attrs: Record<string, string>;
  info: string;
  token: Token;
}

// 框架适配器接口
export interface FrameworkAdapter {
  createVNode(tag: string | any, props?: any, children?: any): any;
  createTextNode(text: string): any;
  createFragment(children: any[]): any;
  createComment(content?: string): any;
  createHtmlNode(html: string): any;
  defineAsyncComponent?(loader: () => Promise<any>, options?: any): any;
}

// 插件配置接口
export interface UniversalMarkdownPluginOptions {
  framework: FrameworkType;
  frameworkLib?: any; // Vue 或 React 库实例
  components?: {
    codeBlock?: (meta: ComponentMeta) => any;
  };
  safeMode?: boolean;
  highlight?: (code: string, lang: string, attrs: string) => string;
  langPrefix?: string;
}

// Vue 适配器
export class VueAdapter implements FrameworkAdapter {
  private vue: any;

  constructor(vue: any) {
    this.vue = vue;
  }

  createVNode(tag: string | any, props: any = {}, children: any = []) {
    return this.vue.createVNode(tag, props, children);
  }

  createTextNode(text: string) {
    return this.vue.createVNode(this.vue.Text, {}, text);
  }

  createFragment(children: any[]) {
    return this.vue.createVNode(this.vue.Fragment, {}, children);
  }

  createComment(content = '') {
    return this.vue.createVNode(this.vue.Comment, {}, content);
  }

  createHtmlNode(html: string) {
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
      children.push(this.createVNode(tagName, attrs, []));
    }

    return this.createFragment(children);
  }

  defineAsyncComponent(loader: () => Promise<any>, options: any = {}) {
    return this.vue.defineAsyncComponent({
      loader,
      loadingComponent: this.createVNode('div', { class: 'loading' }, 'Loading...'),
      delay: 500,
      suspensible: true,
      timeout: 3000,
      ...options
    });
  }
}

// React 适配器
export class ReactAdapter implements FrameworkAdapter {
  private react: any;

  constructor(react: any) {
    this.react = react;
  }

  createVNode(tag: string | any, props: any = {}, children: any = []) {
    const { key, innerHTML, ...restProps } = props;
    
    // 处理 innerHTML
    if (innerHTML) {
      return this.react.createElement(tag, {
        ...restProps,
        key,
        dangerouslySetInnerHTML: { __html: innerHTML }
      });
    }

    // 转换事件处理器
    const reactProps = this.convertPropsToReact(restProps);
    reactProps.key = key;

    return this.react.createElement(tag, reactProps, ...(Array.isArray(children) ? children : [children]).filter(Boolean));
  }

  createTextNode(text: string) {
    return text;
  }

  createFragment(children: any[]) {
    return this.react.createElement(this.react.Fragment, {}, ...children.filter(Boolean));
  }

  createComment() {
    return null; // React doesn't support comment nodes
  }

  createHtmlNode(html: string) {
    return this.react.createElement('div', {
      dangerouslySetInnerHTML: { __html: html },
      key: uuid()
    });
  }

  defineAsyncComponent(loader: () => Promise<any>, options: any = {}) {
    const { React, useState, useEffect, Suspense } = this.react;
    
    return function AsyncComponent(props: any) {
      const [Component, setComponent] = useState(null);
      const [error, setError] = useState(null);

      useEffect(() => {
        loader()
          .then(module => setComponent(() => module.default || module))
          .catch(err => {
            setError(err);
            options.onError?.();
          });
      }, []);

      if (error) {
        return options.errorComponent || React.createElement('div', {}, 'Error loading component');
      }

      if (!Component) {
        return options.loadingComponent || React.createElement('div', {}, 'Loading...');
      }

      return React.createElement(Component, props);
    };
  }

  private convertPropsToReact(props: Record<string, any>): Record<string, any> {
    const reactProps: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on') && typeof value === 'function') {
        // 转换事件名称为 React 格式
        const eventName = key.charAt(2).toUpperCase() + key.slice(3);
        reactProps[`on${eventName}`] = value;
      } else if (key === 'class') {
        reactProps.className = value;
      } else {
        reactProps[key] = value;
      }
    }
    
    return reactProps;
  }
}

// 适配器工厂
export class AdapterFactory {
  static create(framework: FrameworkType, frameworkLib?: any): FrameworkAdapter {
    switch (framework) {
      case FrameworkType.VUE:
        if (!frameworkLib) {
          throw new Error('Vue library instance is required for Vue adapter');
        }
        return new VueAdapter(frameworkLib);
      
      case FrameworkType.REACT:
        if (!frameworkLib) {
          throw new Error('React library instance is required for React adapter');
        }
        return new ReactAdapter(frameworkLib);
      
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }
}