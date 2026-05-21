/** composeSteps 注入的 meta 键，供 RetryStep 等可重入步骤使用 */

/** 从指定步骤下标（不含）重新执行后续链 */
export const PIPELINE_RUN_FROM_INDEX_META = '__pipelineRunFromIndex';

/** 当前正在执行的步骤下标 */
export const PIPELINE_STEP_INDEX_META = '__pipelineStepIndex';

export type PipelineRunFromIndex = (fromIndex: number) => Promise<void>;
