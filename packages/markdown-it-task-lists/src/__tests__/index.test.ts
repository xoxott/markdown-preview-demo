/**
 * Markdown-it Task Lists 插件单元测试
 */

import MarkdownIt from 'markdown-it';
import { beforeEach, describe, expect, it } from 'vitest';
import markdownItTaskLists from '../index';

describe('markdownItTaskLists', () => {
  let md: MarkdownIt;

  beforeEach(() => {
    md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    });
  });

  describe('基础任务列表功能', () => {
    it('应该识别未完成的任务列表项', () => {
      md.use(markdownItTaskLists);

      const content = '- [ ] 未完成的任务';
      const tokens = md.parse(content, {});

      // 查找 list_item_open token
      const listItemToken = tokens.find(
        token => token.type === 'list_item_open' &&
        token.attrs?.some(([name]) => name === 'data-checked')
      );

      expect(listItemToken).toBeDefined();
      const checkedAttr = listItemToken?.attrs?.find(([name]) => name === 'data-checked');
      expect(checkedAttr?.[1]).toBe('false');
    });

    it('应该识别已完成的任务列表项（小写 x）', () => {
      md.use(markdownItTaskLists);

      const content = '- [x] 已完成的任务';
      const tokens = md.parse(content, {});

      const listItemToken = tokens.find(
        token => token.type === 'list_item_open' &&
        token.attrs?.some(([name]) => name === 'data-checked')
      );

      expect(listItemToken).toBeDefined();
      const checkedAttr = listItemToken?.attrs?.find(([name]) => name === 'data-checked');
      expect(checkedAttr?.[1]).toBe('true');
    });

    it('应该识别已完成的任务列表项（大写 X）', () => {
      md.use(markdownItTaskLists);

      const content = '- [X] 已完成的任务';
      const tokens = md.parse(content, {});

      const listItemToken = tokens.find(
        token => token.type === 'list_item_open' &&
        token.attrs?.some(([name]) => name === 'data-checked')
      );

      expect(listItemToken).toBeDefined();
      const checkedAttr = listItemToken?.attrs?.find(([name]) => name === 'data-checked');
      expect(checkedAttr?.[1]).toBe('true');
    });

    it('应该移除任务列表标记文本', () => {
      md.use(markdownItTaskLists);

      const content = '- [ ] 任务内容';
      const tokens = md.parse(content, {});

      // 查找 inline token 中的文本
      const inlineToken = tokens.find(token => token.type === 'inline');
      const textToken = inlineToken?.children?.find(child => child.type === 'text');

      expect(textToken).toBeDefined();
      expect(textToken?.content).not.toContain('[ ]');
      expect(textToken?.content).toContain('任务内容');
    });

    it('应该为任务列表项添加类名', () => {
      md.use(markdownItTaskLists);

      const content = '- [ ] 任务';
      const tokens = md.parse(content, {});

      const listItemToken = tokens.find(
        token => token.type === 'list_item_open' &&
        token.attrs?.some(([name]) => name === 'class')
      );

      expect(listItemToken).toBeDefined();
      const classAttr = listItemToken?.attrs?.find(([name]) => name === 'class');
      expect(classAttr?.[1]).toContain('task-list-item');
    });

    it('应该为父列表添加类名', () => {
      md.use(markdownItTaskLists);

      const content = '- [ ] 任务';
      const tokens = md.parse(content, {});

      const listToken = tokens.find(
        token => (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') &&
        token.attrs?.some(([name]) => name === 'class')
      );

      expect(listToken).toBeDefined();
      const classAttr = listToken?.attrs?.find(([name]) => name === 'class');
      expect(classAttr?.[1]).toContain('contains-task-list');
    });
  });

  describe('渲染功能', () => {
    it('应该渲染包含 checkbox 的 HTML', () => {
      md.use(markdownItTaskLists);

      const content = '- [ ] 未完成的任务';
      const html = md.render(content);

      expect(html).toContain('<input');
      expect(html).toContain('type="checkbox"');
      expect(html).toContain('task-list-item-checkbox');
      expect(html).not.toContain('<label'); // 不应该包含 label
    });

    it('应该渲染已选中的 checkbox', () => {
      md.use(markdownItTaskLists);

      const content = '- [x] 已完成的任务';
      const html = md.render(content);

      expect(html).toContain('checked');
      expect(html).toContain('disabled');
    });

    it('应该默认禁用 checkbox', () => {
      md.use(markdownItTaskLists);

      const content = '- [ ] 任务';
      const html = md.render(content);

      expect(html).toContain('disabled');
    });

    it('应该支持启用 checkbox（enabled: true）', () => {
      md.use(markdownItTaskLists, { enabled: true });

      const content = '- [ ] 任务';
      const html = md.render(content);

      expect(html).not.toContain('disabled');
    });
  });

  describe('嵌套任务列表', () => {
    it('应该支持嵌套的任务列表', () => {
      md.use(markdownItTaskLists);

      const content = `- [ ] 父任务
  - [x] 子任务 1
  - [ ] 子任务 2`;

      const tokens = md.parse(content, {});

      // 查找所有任务列表项
      const taskItems = tokens.filter(
        token => token.type === 'list_item_open' &&
        token.attrs?.some(([name]) => name === 'data-checked')
      );

      expect(taskItems.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('配置选项', () => {
    it('应该使用自定义类名', () => {
      md.use(markdownItTaskLists, {
        itemClass: 'custom-item',
        checkboxClass: 'custom-checkbox',
        listClass: 'custom-list'
      });

      const content = '- [ ] 任务';
      const html = md.render(content);

      expect(html).toContain('custom-item');
      expect(html).toContain('custom-checkbox');
      expect(html).toContain('custom-list');
    });

    it('应该支持 enabled 选项', () => {
      md.use(markdownItTaskLists, { enabled: true });

      const content = '- [ ] 任务';
      const html = md.render(content);

      // enabled 为 true 时，checkbox 不应该有 disabled 属性
      expect(html).not.toContain('disabled');
    });
  });

  describe('混合列表', () => {
    it('应该正确处理混合普通列表和任务列表', () => {
      md.use(markdownItTaskLists);

      const content = `- 普通列表项
- [ ] 任务列表项
- 另一个普通列表项`;

      const tokens = md.parse(content, {});

      // 应该只有一个任务列表项
      const taskItems = tokens.filter(
        token => token.type === 'list_item_open' &&
        token.attrs?.some(([name]) => name === 'data-checked')
      );

      expect(taskItems.length).toBe(1);
    });
  });

  describe('边界情况', () => {
    it('应该处理空的任务列表项', () => {
      md.use(markdownItTaskLists);

      const content = '- [ ]';
      const tokens = md.parse(content, {});

      const listItemToken = tokens.find(
        token => token.type === 'list_item_open' &&
        token.attrs?.some(([name]) => name === 'data-checked')
      );

      expect(listItemToken).toBeDefined();
    });

    it('应该处理只有空格的任务列表项', () => {
      md.use(markdownItTaskLists);

      const content = '- [ ]   ';
      const tokens = md.parse(content, {});

      const listItemToken = tokens.find(
        token => token.type === 'list_item_open' &&
        token.attrs?.some(([name]) => name === 'data-checked')
      );

      expect(listItemToken).toBeDefined();
    });

    it('不应该误识别普通列表为任务列表', () => {
      md.use(markdownItTaskLists);

      const content = '- 这不是任务列表';
      const tokens = md.parse(content, {});

      const taskItems = tokens.filter(
        token => token.type === 'list_item_open' &&
        token.attrs?.some(([name]) => name === 'data-checked')
      );

      expect(taskItems.length).toBe(0);
    });
  });
});

