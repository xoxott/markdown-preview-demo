/**
 * 移动节点命令
 */

import { BaseCommand, type Command } from './Command';
import type { FlowPosition } from '../../types/flow-node';
import type { FlowStateManager } from '../state/FlowStateManager';

/**
 * 移动节点命令
 */
export class MoveNodeCommand extends BaseCommand {
  private nodeId: string;
  private oldPosition: FlowPosition;
  private newPosition: FlowPosition;
  private stateManager: FlowStateManager;

  constructor(
    nodeId: string,
    oldPosition: FlowPosition,
    newPosition: FlowPosition,
    stateManager: FlowStateManager
  ) {
    super();
    this.nodeId = nodeId;
    this.oldPosition = { ...oldPosition };
    this.newPosition = { ...newPosition };
    this.stateManager = stateManager;
  }

  execute(): void {
    this.stateManager.updateNode(this.nodeId, { position: this.newPosition });
  }

  undo(): void {
    this.stateManager.updateNode(this.nodeId, { position: this.oldPosition });
  }

  merge(other: Command): boolean {
    // 只合并同一节点的移动命令
    if (other instanceof MoveNodeCommand && other.nodeId === this.nodeId) {
      // 更新新位置为最新的位置
      this.newPosition = { ...other.newPosition };
      return true;
    }
    return false;
  }

  getDescription(): string {
    return `Move node ${this.nodeId} from (${this.oldPosition.x}, ${this.oldPosition.y}) to (${this.newPosition.x}, ${this.newPosition.y})`;
  }
}

