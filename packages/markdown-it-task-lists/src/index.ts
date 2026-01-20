/**
 * Markdown-it Task Lists Plugin
 *
 * 基于开源 markdown-it-task-lists 的 TypeScript 实现
 * 支持任务列表语法：- [ ] 和 - [x]
 *
 * @module markdown-it-task-lists
 */

import type MarkdownIt from 'markdown-it';
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs';
import type Token from 'markdown-it/lib/token.mjs';
import { DEFAULT_OPTIONS, type TaskListOptions } from './types';

/**
 * 任务列表标记的正则表达式
 * 匹配 [ ] 或 [x] 或 [X] 在段落开头
 * 注意：\s* 允许标记后没有空格（支持空任务列表项）
 */
const TASK_LIST_ITEM_REGEX = /^\[([ xX])\]\s*/;

/**
 * 判断 token 是否以任务列表标记开头
 *
 * @param token - inline token
 * @returns 匹配结果：checked 状态或 null
 */
function startsWithTaskListMarker(token: Token): boolean | null {
  if (token.type !== 'inline') {
    return null;
  }

  // 检查第一个 child 是否为 text 类型且匹配任务列表标记
  if (token.children && token.children.length > 0) {
    const firstChild = token.children[0];
    if (firstChild.type === 'text') {
      const match = firstChild.content.match(TASK_LIST_ITEM_REGEX);
      if (match) {
        return match[1].toLowerCase() === 'x';
      }
    }
  }

  return null;
}

/**
 * 判断一个列表项是否为任务列表项
 *
 * @param tokens - token 数组
 * @param index - 当前 list_item_open token 的索引
 * @returns 是否为任务列表项以及 checked 状态
 */
function isTaskListItem(tokens: Token[], index: number): { isTask: boolean; checked: boolean } {
  if (tokens[index].type !== 'list_item_open') {
    return { isTask: false, checked: false };
  }

  // 检查是否是紧凑列表项（-1 表示紧凑列表）
  if (tokens[index].info === 'task-checked' || tokens[index].info === 'task-unchecked') {
    return {
      isTask: true,
      checked: tokens[index].info === 'task-checked'
    };
  }

  // 查找对应的 paragraph_open 和 inline token
  // list_item_open -> paragraph_open -> inline
  let inlineIndex = -1;
  for (let i = index + 1; i < tokens.length; i++) {
    if (tokens[i].type === 'list_item_close') {
      break;
    }
    if (tokens[i].type === 'inline') {
      inlineIndex = i;
      break;
    }
  }

  if (inlineIndex === -1) {
    return { isTask: false, checked: false };
  }

  const checkedState = startsWithTaskListMarker(tokens[inlineIndex]);
  if (checkedState === null) {
    return { isTask: false, checked: false };
  }

  return { isTask: true, checked: checkedState };
}

/**
 * 从文本中移除任务列表标记
 *
 * @param token - inline token
 */
function removeTaskListMarker(token: Token): void {
  if (token.children && token.children.length > 0) {
    const firstChild = token.children[0];
    if (firstChild.type === 'text') {
      firstChild.content = firstChild.content.replace(TASK_LIST_ITEM_REGEX, '');
      // 如果替换后内容为空，则移除该 token
      if (firstChild.content === '') {
        token.children.shift();
      }
    }
  }
}

/**
 * 为父列表添加任务列表类名
 *
 * @param tokens - token 数组
 * @param index - 当前 list_item_open 的索引
 * @param listClass - 要添加的类名
 */
function markParentAsTaskList(tokens: Token[], index: number, listClass: string): void {
  // 向上查找最近的 bullet_list_open 或 ordered_list_open
  for (let i = index - 1; i >= 0; i--) {
    const token = tokens[i];
    if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      const classAttr = token.attrGet('class');
      if (!classAttr) {
        token.attrSet('class', listClass);
      } else if (!classAttr.includes(listClass)) {
        token.attrSet('class', `${classAttr} ${listClass}`);
      }
      break;
    }
  }
}

/**
 * 核心规则：处理任务列表
 * 在 token 流中插入 html_inline token（checkbox 和 label）
 */
function taskListsRule(state: StateCore, options: Required<TaskListOptions>): boolean {
  const tokens = state.tokens;
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    // 只处理 list_item_open token
    if (token.type !== 'list_item_open') {
      i++;
      continue;
    }

    const { isTask, checked } = isTaskListItem(tokens, i);

    if (!isTask) {
      i++;
      continue;
    }

    // 标记列表项为任务列表项
    const itemClass = token.attrGet('class');
    if (!itemClass) {
      token.attrSet('class', options.itemClass);
    } else if (!itemClass.includes(options.itemClass)) {
      token.attrSet('class', `${itemClass} ${options.itemClass}`);
    }

    // 添加 data-checked 属性
    token.attrSet('data-checked', checked ? 'true' : 'false');
    token.info = checked ? 'task-checked' : 'task-unchecked';

    // 查找对应的 paragraph_open 和 inline token
    let paragraphOpenIdx = -1;
    let inlineIdx = -1;

    for (let j = i + 1; j < tokens.length; j++) {
      if (tokens[j].type === 'list_item_close') {
        break;
      }
      if (tokens[j].type === 'paragraph_open') {
        paragraphOpenIdx = j;
      }
      if (tokens[j].type === 'inline') {
        inlineIdx = j;
        break;
      }
    }

    if (inlineIdx !== -1) {
      const inlineToken = tokens[inlineIdx];

      // 移除任务列表标记文本
      removeTaskListMarker(inlineToken);

      // 在 paragraph_open 后插入 checkbox token
      const insertIdx = paragraphOpenIdx !== -1 ? paragraphOpenIdx + 1 : inlineIdx;
      const checkboxToken = createCheckboxToken(state, checked, options);

      // 插入 checkbox token
      tokens.splice(insertIdx, 0, checkboxToken);

      // 调整索引，跳过插入的 token
      i = inlineIdx + 2;
    } else {
      i++;
    }

    // 标记父列表
    markParentAsTaskList(tokens, i, options.listClass);
  }

  return false;
}

/**
 * 创建 checkbox HTML token
 */
function createCheckboxToken(state: StateCore, checked: boolean, options: Required<TaskListOptions>): Token {
  const token = new state.Token('html_inline', '', 0);
  const disabledAttr = options.enabled ? '' : ' disabled';
  const checkedAttr = checked ? ' checked' : '';
  token.content = `<input class="${options.checkboxClass}" type="checkbox"${disabledAttr}${checkedAttr}>`;
  return token;
}

/**
 * Markdown-it Task Lists 插件
 *
 * @param md - MarkdownIt 实例
 * @param userOptions - 用户配置选项
 */
export default function markdownItTaskLists(md: MarkdownIt, userOptions?: TaskListOptions): void {
  const options: Required<TaskListOptions> = {
    ...DEFAULT_OPTIONS,
    ...userOptions
  };

  // 注册核心规则：在 inline 之后处理任务列表
  // 这个规则会在 token 流中插入 html_inline token（checkbox 和 label）
  // 这样可以兼容 markdown-it-render-vnode，html_inline 会被自动转换为 VNode
  md.core.ruler.after('inline', 'task-lists', (state) => {
    taskListsRule(state, options);
  });
}

/**
 * 导出类型
 */
export type { TaskListOptions } from './types';
