/**
 * bashSleepDetect — sleep命令检测与重定向建议
 *
 * 对齐 Claude Code BashTool/sleep检测:
 *
 * CC检测 sleep N>=2 → 建议用后台或monitor替代阻塞sleep
 *
 * - 纯 sleep N (N>=2) → 检测并建议重定向
 * - sleep嵌入复合命令 → 不检测(可能是有意的间隔)
 * - sleep <2s → 不检测(太短不值得重定向)
 */

/** Sleep检测结果 */
export interface SleepDetectResult {
  readonly isSleepCommand: boolean;
  readonly sleepSeconds?: number;
  readonly suggestion?: string;
}

/**
 * detectSleepCommand — 检测是否为纯sleep命令
 *
 * 匹配: sleep N (N>=2) 或 sleep Ns/Nm/Nh 不匹配: sleep嵌入复合命令(如 "build && sleep 5 && test") 不匹配: sleep
 * 1（太短不值得重定向）
 */
export function detectSleepCommand(command: string): SleepDetectResult {
  const trimmed = command.trim();

  // 匹配带单位后缀的纯 sleep 命令: sleep 5m, sleep 1h
  const sleepWithUnit = trimmed.match(/^sleep\s+(\d+(?:\.\d+)?)([smh])\s*$/);
  if (sleepWithUnit) {
    const val = Number.parseFloat(sleepWithUnit[1]);
    const unit = sleepWithUnit[2];
    let seconds = val;
    if (unit === 'm') seconds = val * 60;
    if (unit === 'h') seconds = val * 3600;
    if (seconds < 2) return { isSleepCommand: false };
    const durationText = seconds >= 60 ? `${Math.round(seconds / 60)}分` : `${seconds}秒`;
    return {
      isSleepCommand: true,
      sleepSeconds: seconds,
      suggestion: `sleep ${durationText}较长，建议使用后台运行(run_in_background=true) 或 /monitor 替代阻塞等待`
    };
  }

  // 匹配纯 sleep N 命令(无单位，默认秒)
  const sleepMatch = trimmed.match(/^sleep\s+(\d+(?:\.\d+)?)\s*$/);
  if (sleepMatch) {
    const seconds = Number.parseFloat(sleepMatch[1]);
    if (seconds < 2) return { isSleepCommand: false };
    const durationText = seconds >= 60 ? `${Math.round(seconds / 60)}分` : `${seconds}秒`;
    return {
      isSleepCommand: true,
      sleepSeconds: seconds,
      suggestion: `sleep ${durationText}较长，建议使用后台运行(run_in_background=true) 或 /monitor 替代阻塞等待`
    };
  }

  return { isSleepCommand: false };
}
