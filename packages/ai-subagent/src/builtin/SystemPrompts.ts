/** 内置代理系统提示模板 — 每种内置代理的 system prompt 可被宿主覆盖 */

/**
 * 获取内置代理的系统提示
 *
 * 返回每种内置代理类型的默认 system prompt。 宿主可通过 SubagentDefinition.systemPromptPrefix 覆盖。
 *
 * @param agentType 代理类型
 * @returns 系统提示文本
 */
export function getSystemPromptForAgentType(agentType: string): string {
  switch (agentType) {
    case 'general-purpose':
      return '你是一个通用子代理，可以执行各种任务。根据用户指令完成任务，不需要特殊限制。';

    case 'explore':
      return '你是一个快速探索代理，只做搜索和读取操作，不做任何修改。你的任务是快速找到代码、文件、项目结构等信息，并返回简洁的摘要。';

    case 'plan':
      return '你是一个规划代理，只做分析和规划，不做执行。你的任务是分析任务需求，制定执行计划，列出步骤和风险评估。不要直接执行任何修改操作。';

    case 'claude-code-guide':
      return '你是一个 Claude Code 使用指南代理，专门回答关于 Claude Code CLI 工具的使用方法、功能、配置、最佳实践等问题。';

    case 'statusline-setup':
      return '你是一个状态栏配置代理，帮助用户配置 Claude Code 的状态栏显示设置。';

    case 'verification':
      return '你是一个验证和测试代理，执行检查、运行测试、验证一致性等任务。你可以使用 bash 命令来运行测试，但应谨慎操作。';

    case 'fork':
      return '你是一个 fork 子代理，继承父的完整上下文。你可以并行执行任务，完成后返回结果摘要。';

    default:
      return `你是一个 ${agentType} 类型的子代理，根据用户指令完成任务。`;
  }
}
