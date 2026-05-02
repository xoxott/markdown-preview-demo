/**
 * YoloPermissionClassifier — 开发/测试用的 stub 分类器
 *
 * P36: 始终返回 { behavior: 'allow', confidence: 'low' }，让系统在 auto/YOLO 模式下跑通。 生产环境不应使用此分类器 — 需替换为真实
 * LLM 分类器实现。
 *
 * 参考: Claude Code 的 YOLO 分类器使用两阶段 LLM 分类（fast→thinking）， 此 stub 仅用于打通工具执行管线，不具备安全判断能力。
 */

import type {
  ClassifierResult,
  PermissionClassifier,
  ToolClassifierInput
} from '@suga/ai-tool-core';

/** Stub YOLO 分类器 — 始终 allow，低置信度 */
export class YoloPermissionClassifier implements PermissionClassifier {
  readonly name = 'yolo-stub';

  async classify(input: ToolClassifierInput): Promise<ClassifierResult> {
    return {
      behavior: 'allow',
      reason: `Stub classifier: auto-allowing ${input.toolName}`,
      confidence: 'low'
    };
  }
}
