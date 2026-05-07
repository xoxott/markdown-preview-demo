/**
 * Notifier — 终端 / 系统通知派发器
 *
 * 对齐 CC services/notifier.ts。CC 端把通知策略（auto/iterm2/kitty/ghostty/bell） 委托给
 * ink/useTerminalNotification，本模块抽象出 channel + adapter，让任意宿主 注入其支持的通知方式。
 */

// ============================================================
// 类型
// ============================================================

/** 通知频道 */
export type NotificationChannel =
  | 'auto'
  | 'iterm2'
  | 'iterm2_with_bell'
  | 'kitty'
  | 'ghostty'
  | 'terminal_bell'
  | 'system'
  | 'notifications_disabled'
  | 'none';

/** 单条通知 */
export interface NotificationOptions {
  readonly message: string;
  readonly title?: string;
  readonly notificationType: string;
}

/** 终端适配器 — 由宿主实现 */
export interface TerminalNotificationAdapter {
  notifyITerm2?: (opts: NotificationOptions) => void;
  notifyKitty?: (opts: NotificationOptions & { id: number }) => void;
  notifyGhostty?: (opts: NotificationOptions) => void;
  notifyBell?: () => void;
  notifySystem?: (opts: NotificationOptions) => Promise<void>;
}

/** 终端检测信息 */
export interface TerminalEnvironment {
  /** 终端 emulator 名称（'iTerm.app'/'Apple_Terminal'/'kitty'/'ghostty'/...） */
  readonly terminal: string;
  /** Apple_Terminal 是否 bell-disabled（用于 auto 模式回退判断） */
  readonly appleTerminalBellDisabled?: boolean;
}

/** 通知钩子（CC 端 executeNotificationHooks） */
export type NotificationHook = (opts: NotificationOptions) => void | Promise<void>;

/** Notifier 配置 */
export interface NotifierConfig {
  /** 用户偏好 channel */
  readonly preferredChannel?: NotificationChannel;
  /** 注入的终端适配器 */
  readonly terminal?: TerminalNotificationAdapter;
  /** 终端检测信息（用于 auto channel） */
  readonly env?: TerminalEnvironment;
  /** 通知前置 hook */
  readonly hooks?: readonly NotificationHook[];
  /** 注入的事件 logger */
  readonly logEvent?: (event: string, metadata: Record<string, string | undefined>) => void;
}

// ============================================================
// 主流程
// ============================================================

const DEFAULT_TITLE = 'Claude Code';

function generateKittyId(): number {
  return Math.floor(Math.random() * 10000);
}

/** 发送通知 — 返回实际使用的 channel 字符串 */
export async function sendNotification(
  notif: NotificationOptions,
  config: NotifierConfig = {}
): Promise<string> {
  const channel = config.preferredChannel ?? 'auto';
  const terminal = config.terminal;

  for (const hook of config.hooks ?? []) {
    try {
      await hook(notif);
    } catch {
      // 钩子失败不应影响通知本身
    }
  }

  let methodUsed: string;
  try {
    methodUsed = await dispatchToChannel(channel, notif, terminal, config.env);
  } catch {
    methodUsed = 'error';
  }

  config.logEvent?.('tengu_notification_method_used', {
    configured_channel: channel,
    method_used: methodUsed,
    term: config.env?.terminal
  });

  return methodUsed;
}

async function dispatchToChannel(
  channel: NotificationChannel,
  notif: NotificationOptions,
  terminal: TerminalNotificationAdapter | undefined,
  env: TerminalEnvironment | undefined
): Promise<string> {
  const title = notif.title ?? DEFAULT_TITLE;
  const enriched: NotificationOptions = { ...notif, title };

  switch (channel) {
    case 'auto':
      return autoChannel(enriched, terminal, env);
    case 'iterm2':
      terminal?.notifyITerm2?.(enriched);
      return 'iterm2';
    case 'iterm2_with_bell':
      terminal?.notifyITerm2?.(enriched);
      terminal?.notifyBell?.();
      return 'iterm2_with_bell';
    case 'kitty':
      terminal?.notifyKitty?.({ ...enriched, id: generateKittyId() });
      return 'kitty';
    case 'ghostty':
      terminal?.notifyGhostty?.(enriched);
      return 'ghostty';
    case 'terminal_bell':
      terminal?.notifyBell?.();
      return 'terminal_bell';
    case 'system':
      if (terminal?.notifySystem) {
        await terminal.notifySystem(enriched);
        return 'system';
      }
      return 'no_method_available';
    case 'notifications_disabled':
      return 'disabled';
    default:
      return 'none';
  }
}

async function autoChannel(
  notif: NotificationOptions,
  terminal: TerminalNotificationAdapter | undefined,
  env: TerminalEnvironment | undefined
): Promise<string> {
  if (!terminal || !env) return 'no_method_available';
  switch (env.terminal) {
    case 'Apple_Terminal':
      if (env.appleTerminalBellDisabled === true) {
        terminal.notifyBell?.();
        return 'terminal_bell';
      }
      return 'no_method_available';
    case 'iTerm.app':
      terminal.notifyITerm2?.(notif);
      return 'iterm2';
    case 'kitty':
      terminal.notifyKitty?.({ ...notif, id: generateKittyId() });
      return 'kitty';
    case 'ghostty':
      terminal.notifyGhostty?.(notif);
      return 'ghostty';
    default:
      return 'no_method_available';
  }
}
