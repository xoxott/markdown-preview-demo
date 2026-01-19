/**
 * Token 预处理模块
 *
 * @module token-processor
 */

import type { RenderEnv, Token } from './types';
import { DOM_ATTR_NAME } from './constants';
import { getSourceLineRange, validateAttrValue } from './utils';

/**
 * 生成 Token 的唯一 key
 *
 * @param token - Token 对象
 * @param index - Token 索引
 * @param parentKey - 父级 key（可选）
 * @returns 唯一 key 字符串
 */
function generateTokenKey(token: Token, index: number, parentKey?: string): string {
  // 基于 token 类型、索引、nesting 和位置生成唯一 key
  const baseKey = `${token.type}-${index}-${token.nesting}-${token.map?.[0] || 0}`;
  return parentKey ? `${parentKey}/${baseKey}` : baseKey;
}

/**
 * 预处理 Token，添加元数据和安全检查
 *
 * @param token - 需要处理的 Token
 * @param env - 渲染环境变量
 */
export function processToken(token: Token, env?: RenderEnv): void {
  // 初始化 meta 对象
  if (!token.meta) {
    token.meta = {};
  }

  // 安全模式处理
  if (env?.safeMode && token.attrs) {
    const safeAttrs: Array<[string, string]> = [];

    for (const [name, value] of token.attrs) {
      const lowerName = name.toLowerCase();

      // 验证属性值安全性
      if (validateAttrValue(lowerName, value)) {
        safeAttrs.push([name, value]);
      } else {
        // 不安全的属性，设为空值
        safeAttrs.push([name, '']);
      }
    }

    token.attrs = safeAttrs;
  }

  // 块级元素处理
  if (token.block && token.map) {
    const [lineStart, lineEnd] = getSourceLineRange(token, env);

    // 设置源码行号
    token.attrSet(DOM_ATTR_NAME.SOURCE_LINE_START, String(lineStart + 1));
    token.attrSet(DOM_ATTR_NAME.SOURCE_LINE_END, String(lineEnd + 1));

    // 初始化 meta.attrs
    if (!token.meta.attrs) {
      token.meta.attrs = {};
    }

    // 转换属性数组为对象（性能优化：使用 for 循环）
    if (token.attrs) {
      for (let i = 0; i < token.attrs.length; i++) {
        const [name, value] = token.attrs[i];
        token.meta.attrs[name] = value;
      }
    }
  }
}

/**
 * 批量预处理 Token 数组（递归处理，生成 key）
 *
 * @param tokens - Token 数组
 * @param env - 渲染环境
 * @param parentKey - 父级 key（用于嵌套结构）
 */
export function preprocessTokens(tokens: Token[], env?: RenderEnv, parentKey?: string): void {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    processToken(token, env);

    // 生成并存储 Token key
    const tokenKey = generateTokenKey(token, i, parentKey);
    if (!token.meta) {
      token.meta = {};
    }
    token.meta.key = tokenKey;

    // 设置 Token 索引（用于 DOM 属性）
    if (token.block) {
      token.attrSet(DOM_ATTR_NAME.TOKEN_IDX, i.toString());
      // 同时设置 key 到属性中（用于 Vue/React 的 key）
      token.attrSet('data-token-key', tokenKey);
    }

    // 递归处理子 Token
    if (token.children) {
      preprocessTokens(token.children, env, tokenKey);
    }
  }
}

