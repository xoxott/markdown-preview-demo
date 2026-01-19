// 导出渲染器主接口
export {
  render,
  renderAttrs,
  renderToken
} from './renderer';

// 导出子模块类型和工具
export type { RuleRenderResult } from './rule-parser';
export { parseRuleResult } from './rule-parser';
export { addChildToParent, renderInlineContent } from './node-helpers';
export { renderSingleToken } from './token-renderer';

// 导出 Token 处理
export { preprocessTokens } from '../token-processor';

