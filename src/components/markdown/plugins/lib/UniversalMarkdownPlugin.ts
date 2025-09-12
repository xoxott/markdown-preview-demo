/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-09-12 16:28:55
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-09-12 17:14:05
 * @FilePath: \markdown-preview-demo\src\components\markdown\plugins\lib\UniversalMarkdownPlugin.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { FrameworkAdapter, UniversalMarkdownPluginOptions } from "./FrameworkAdapter";
import { UniversalRenderer } from "./UniversalRenderer";
import { AdapterFactory } from './FrameworkAdapter'
import MarkdownIt from "markdown-it";

// 主插件类
export class UniversalMarkdownPlugin {
  private adapter: FrameworkAdapter;
  private renderer: UniversalRenderer;
  private options: UniversalMarkdownPluginOptions;

  constructor(options: UniversalMarkdownPluginOptions) {
    this.options = options;
    this.adapter = AdapterFactory.create(options.framework, options.frameworkLib);
    this.renderer = new UniversalRenderer(this.adapter, options);
  }

  install(md: MarkdownIt) {
    const rules = this.renderer.factory.createRenderRules();
    
    Object.assign(md.renderer.rules, rules);
    md.renderer.render = this.renderer.render.bind(this.renderer);
    md.renderer.renderInline = this.renderer.render.bind(this.renderer);
    md.renderer.renderAttrs = this.renderer.renderAttrs.bind(this.renderer);
    md.renderer.renderToken = this.renderer.renderToken.bind(this.renderer);
  }
}

// 便捷的工厂函数
export function createMarkdownPlugin(options: UniversalMarkdownPluginOptions) {
  return (md: MarkdownIt) => {
    const plugin = new UniversalMarkdownPlugin(options);
    plugin.install(md);
  };
}

// 导出默认插件创建函数
export default createMarkdownPlugin;