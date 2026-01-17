/**
 * LoggerManager 测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoggerManager } from '../../managers/LoggerManager';
import type { LogOutput } from '../../types';

describe('LoggerManager', () => {
  let manager: LoggerManager;

  beforeEach(() => {
    manager = new LoggerManager();
  });

  describe('构造函数', () => {
    it('应该使用默认配置', () => {
      const defaultManager = new LoggerManager();
      expect(defaultManager.shouldLog()).toBe(false);
      expect(defaultManager.shouldLogRequest()).toBe(false);
      expect(defaultManager.shouldLogResponse()).toBe(false);
      expect(defaultManager.shouldLogError()).toBe(false);
    });

    it('应该使用自定义配置', () => {
      const customManager = new LoggerManager({
        enabled: true,
        logRequest: true,
        logResponse: false,
        logError: true,
      });
      expect(customManager.shouldLog()).toBe(true);
      expect(customManager.shouldLogRequest()).toBe(true);
      expect(customManager.shouldLogResponse()).toBe(false);
      expect(customManager.shouldLogError()).toBe(true);
    });

    it('应该使用自定义输出函数', () => {
      const output = vi.fn();
      const customManager = new LoggerManager({
        enabled: true,
        output,
      });
      const loggerOutput = customManager.getOutput();
      loggerOutput('test message');
      expect(output).toHaveBeenCalledWith('test message');
    });
  });

  describe('setOptions', () => {
    it('应该更新配置选项', () => {
      manager.setOptions({ enabled: true });
      expect(manager.shouldLog()).toBe(true);
    });

    it('应该部分更新配置选项', () => {
      manager.setOptions({ enabled: true, logRequest: false });
      expect(manager.shouldLog()).toBe(true);
      expect(manager.shouldLogRequest()).toBe(false);
      expect(manager.shouldLogResponse()).toBe(true); // 保持默认值
    });

    it('应该更新输出函数', () => {
      const output = vi.fn();
      manager.setOptions({ output });
      const loggerOutput = manager.getOutput();
      loggerOutput('test message');
      expect(output).toHaveBeenCalledWith('test message');
    });
  });

  describe('shouldLog', () => {
    it('应该在 enabled=false 时返回 false', () => {
      expect(manager.shouldLog()).toBe(false);
    });

    it('应该在 enabled=true 时返回 true', () => {
      manager.setOptions({ enabled: true });
      expect(manager.shouldLog()).toBe(true);
    });

    it('应该优先使用 override 参数（true）', () => {
      expect(manager.shouldLog(true)).toBe(true);
    });

    it('应该优先使用 override 参数（false）', () => {
      manager.setOptions({ enabled: true });
      expect(manager.shouldLog(false)).toBe(false);
    });

    it('应该在 override=undefined 时使用全局配置', () => {
      manager.setOptions({ enabled: true });
      expect(manager.shouldLog(undefined)).toBe(true);
    });
  });

  describe('shouldLogRequest', () => {
    it('应该在 enabled=false 时返回 false', () => {
      expect(manager.shouldLogRequest()).toBe(false);
    });

    it('应该在 enabled=true 且 logRequest=true 时返回 true', () => {
      manager.setOptions({ enabled: true, logRequest: true });
      expect(manager.shouldLogRequest()).toBe(true);
    });

    it('应该在 enabled=true 但 logRequest=false 时返回 false', () => {
      manager.setOptions({ enabled: true, logRequest: false });
      expect(manager.shouldLogRequest()).toBe(false);
    });

    it('应该优先使用 override 参数', () => {
      expect(manager.shouldLogRequest(true)).toBe(true);
      manager.setOptions({ enabled: true });
      expect(manager.shouldLogRequest(false)).toBe(false);
    });
  });

  describe('shouldLogResponse', () => {
    it('应该在 enabled=false 时返回 false', () => {
      expect(manager.shouldLogResponse()).toBe(false);
    });

    it('应该在 enabled=true 且 logResponse=true 时返回 true', () => {
      manager.setOptions({ enabled: true, logResponse: true });
      expect(manager.shouldLogResponse()).toBe(true);
    });

    it('应该在 enabled=true 但 logResponse=false 时返回 false', () => {
      manager.setOptions({ enabled: true, logResponse: false });
      expect(manager.shouldLogResponse()).toBe(false);
    });

    it('应该优先使用 override 参数', () => {
      expect(manager.shouldLogResponse(true)).toBe(true);
      manager.setOptions({ enabled: true });
      expect(manager.shouldLogResponse(false)).toBe(false);
    });
  });

  describe('shouldLogError', () => {
    it('应该在 enabled=false 时返回 false', () => {
      expect(manager.shouldLogError()).toBe(false);
    });

    it('应该在 enabled=true 且 logError=true 时返回 true', () => {
      manager.setOptions({ enabled: true, logError: true });
      expect(manager.shouldLogError()).toBe(true);
    });

    it('应该在 enabled=true 但 logError=false 时返回 false', () => {
      manager.setOptions({ enabled: true, logError: false });
      expect(manager.shouldLogError()).toBe(false);
    });

    it('应该优先使用 override 参数', () => {
      expect(manager.shouldLogError(true)).toBe(true);
      manager.setOptions({ enabled: true });
      expect(manager.shouldLogError(false)).toBe(false);
    });
  });

  describe('getOutput', () => {
    it('应该返回默认的 console.log', () => {
      const output = manager.getOutput();
      expect(typeof output).toBe('function');
    });

    it('应该返回自定义的输出函数', () => {
      const customOutput: LogOutput = vi.fn();
      manager.setOptions({ output: customOutput });
      const output = manager.getOutput();
      expect(output).toBe(customOutput);
    });
  });
});

