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
 * Token 类型常量
 */
const TOKEN_TYPES = {
  LIST_ITEM_OPEN: 'list_item_open',
  LIST_ITEM_CLOSE: 'list_item_close',
  PARAGRAPH_OPEN: 'paragraph_open',
  INLINE: 'inline',
  BULLET_LIST_OPEN: 'bullet_list_open',
  ORDERED_LIST_OPEN: 'ordered_list_open',
  HTML_INLINE: 'html_inline',
  TEXT: 'text'
} as const;

/**
 * 任务列表信息标记常量
 */
const TASK_INFO = {
  CHECKED: 'task-checked',
  UNCHECKED: 'task-unchecked'
} as const;

/**
 * 任务列表标记的正则表达式
 * 匹配 [ ] 或 [x] 或 [X] 在段落开头
 * 注意：\s* 允许标记后没有空格（支持空任务列表项）
 */
const TASK_LIST_ITEM_REGEX = /^\[([ xX])\]\s*/;

/**
 * Token 查找结果接口
 */
interface TokenSearchResult {
  paragraphOpenIdx: number;
  inlineIdx: number;
}

/**
 * 任务列表项检测结果接口
 */
interface TaskListItemResult {
  isTask: boolean;
  checked: boolean;
  inlineIdx?: number;
  paragraphOpenIdx?: number;
}

/**
 * 判断 token 是否以任务列表标记开头
 *
 * @param token - inline token
 * @returns 匹配结果：checked 状态或 null
 */
function startsWithTaskListMarker(token: Token): boolean | null {
  if (token.type !== TOKEN_TYPES.INLINE || !token.children?.length) {
    return null;
  }

  const firstChild = token.children[0];
  if (firstChild.type !== TOKEN_TYPES.TEXT) {
    return null;
  }

  const match = firstChild.content.match(TASK_LIST_ITEM_REGEX);
  return match ? match[1].toLowerCase() === 'x' : null;
}

/**
 * 在列表项内查找相关 token
 *
 * @param tokens - token 数组
 * @param startIndex - 起始索引（list_item_open 之后）
 * @param endIndex - 结束索引（list_item_close 之前）
 * @returns 查找结果
 */
function findTokensInListItem(
  tokens: Token[],
  startIndex: number,
  endIndex: number
): TokenSearchResult {
  const result: TokenSearchResult = {
    paragraphOpenIdx: -1,
    inlineIdx: -1
  };

  for (let i = startIndex; i < endIndex; i++) {
    const token = tokens[i];
    if (token.type === TOKEN_TYPES.PARAGRAPH_OPEN && result.paragraphOpenIdx === -1) {
      result.paragraphOpenIdx = i;
    }
    if (token.type === TOKEN_TYPES.INLINE && result.inlineIdx === -1) {
      result.inlineIdx = i;
      break; // 找到第一个 inline token 后就可以停止了
    }
  }

  return result;
}

/**
 * 判断一个列表项是否为任务列表项（优化版本，合并查找逻辑）
 *
 * @param tokens - token 数组
 * @param index - 当前 list_item_open token 的索引
 * @returns 是否为任务列表项以及相关索引信息
 */
function detectTaskListItem(tokens: Token[], index: number): TaskListItemResult {
  const token = tokens[index];
  if (token.type !== TOKEN_TYPES.LIST_ITEM_OPEN) {
    return { isTask: false, checked: false };
  }

  // 检查是否已经标记为任务列表项
  if (token.info === TASK_INFO.CHECKED || token.info === TASK_INFO.UNCHECKED) {
    return {
      isTask: true,
      checked: token.info === TASK_INFO.CHECKED
    };
  }

  // 查找 list_item_close 的位置
  let endIndex = tokens.length;
  for (let i = index + 1; i < tokens.length; i++) {
    if (tokens[i].type === TOKEN_TYPES.LIST_ITEM_CLOSE) {
      endIndex = i;
      break;
    }
  }

  // 一次性查找所有需要的 token
  const { paragraphOpenIdx, inlineIdx } = findTokensInListItem(tokens, index + 1, endIndex);

  if (inlineIdx === -1) {
    return { isTask: false, checked: false };
  }

  const checkedState = startsWithTaskListMarker(tokens[inlineIdx]);
  if (checkedState === null) {
    return { isTask: false, checked: false };
  }

  return {
    isTask: true,
    checked: checkedState,
    inlineIdx,
    paragraphOpenIdx
  };
}

/**
 * 从文本中移除任务列表标记
 *
 * @param token - inline token
 */
function removeTaskListMarker(token: Token): void {
  if (!token.children?.length) {
    return;
  }

  const firstChild = token.children[0];
  if (firstChild.type === TOKEN_TYPES.TEXT) {
    firstChild.content = firstChild.content.replace(TASK_LIST_ITEM_REGEX, '');
    // 如果替换后内容为空，则移除该 token
    if (firstChild.content === '') {
      token.children.shift();
    }
  }
}

/**
 * 安全地为 token 添加类名
 *
 * @param token - 目标 token
 * @param className - 要添加的类名
 */
function addClassName(token: Token, className: string): void {
  const existingClass = token.attrGet('class') || '';
  if (!existingClass.includes(className)) {
    const newClass = existingClass ? `${existingClass} ${className}` : className;
    token.attrSet('class', newClass);
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
    if (token.type === TOKEN_TYPES.BULLET_LIST_OPEN || token.type === TOKEN_TYPES.ORDERED_LIST_OPEN) {
      addClassName(token, listClass);
      break;
    }
  }
}

/**
 * 创建 checkbox HTML token
 *
 * @param state - StateCore 实例
 * @param checked - 是否选中
 * @param options - 插件选项
 * @returns checkbox token
 */
function createCheckboxToken(
  state: StateCore,
  checked: boolean,
  options: Required<TaskListOptions>
): Token {
  const token = new state.Token(TOKEN_TYPES.HTML_INLINE, '', 0);
  const disabledAttr = options.enabled ? '' : ' disabled';
  const checkedAttr = checked ? ' checked' : '';
  token.content = `<input class="${options.checkboxClass}" type="checkbox"${disabledAttr}${checkedAttr}>`;
  return token;
}

/**
 * 处理单个任务列表项
 *
 * @param tokens - token 数组
 * @param state - StateCore 实例
 * @param index - list_item_open token 的索引
 * @param result - 任务列表项检测结果
 * @param options - 插件选项
 * @returns 新的索引位置
 */
function processTaskListItem(
  tokens: Token[],
  state: StateCore,
  index: number,
  result: TaskListItemResult,
  options: Required<TaskListOptions>
): number {
  const listItemToken = tokens[index];

  // 标记列表项为任务列表项
  addClassName(listItemToken, options.itemClass);
  listItemToken.attrSet('data-checked', result.checked ? 'true' : 'false');
  listItemToken.info = result.checked ? TASK_INFO.CHECKED : TASK_INFO.UNCHECKED;

  // 如果有 inline token，处理它
  if (result.inlineIdx !== undefined && result.inlineIdx !== -1) {
    const inlineToken = tokens[result.inlineIdx];

    // 移除任务列表标记文本
    removeTaskListMarker(inlineToken);

    // 在 paragraph_open 后插入 checkbox token
    const insertIdx =
      result.paragraphOpenIdx !== undefined && result.paragraphOpenIdx !== -1
        ? result.paragraphOpenIdx + 1
        : result.inlineIdx;
    const checkboxToken = createCheckboxToken(state, result.checked, options);

    // 插入 checkbox token
    tokens.splice(insertIdx, 0, checkboxToken);

    // 标记父列表
    markParentAsTaskList(tokens, index, options.listClass);

    // 返回新的索引位置（跳过插入的 token）
    return result.inlineIdx + 2;
  }

  // 标记父列表
  markParentAsTaskList(tokens, index, options.listClass);

  return index + 1;
}

/**
 * 核心规则：处理任务列表
 * 在 token 流中插入 html_inline token（checkbox）
 */
function taskListsRule(state: StateCore, options: Required<TaskListOptions>): boolean {
  const tokens = state.tokens;
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    // 只处理 list_item_open token
    if (token.type !== TOKEN_TYPES.LIST_ITEM_OPEN) {
      i++;
      continue;
    }

    // 检测是否为任务列表项（一次性获取所有信息）
    const result = detectTaskListItem(tokens, i);

    if (!result.isTask) {
      i++;
      continue;
    }

    // 处理任务列表项
    i = processTaskListItem(tokens, state, i, result, options);
  }

  return false;
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
