/** SettingLayer 类型 + 优先级 + 映射函数测试 */

import { describe, expect, it } from 'vitest';
import type { SettingLayer } from '../types/settings-layer';
import {
  SETTING_LAYERS,
  SETTING_LAYER_PRIORITY,
  getMergeStrategy,
  settingLayerToRuleSource
} from '../types/settings-layer';

describe('SETTING_LAYERS', () => {
  it('应有6种层', () => {
    expect(SETTING_LAYERS).toHaveLength(6);
    expect(SETTING_LAYERS).toEqual(['plugin', 'user', 'project', 'local', 'flag', 'policy']);
  });

  it('优先级从低到高排列', () => {
    for (let i = 1; i < SETTING_LAYERS.length; i++) {
      expect(SETTING_LAYER_PRIORITY[SETTING_LAYERS[i]]).toBeGreaterThan(
        SETTING_LAYER_PRIORITY[SETTING_LAYERS[i - 1]]
      );
    }
  });
});

describe('SETTING_LAYER_PRIORITY', () => {
  it('plugin=0, user=1, project=2, local=3, flag=4, policy=5', () => {
    expect(SETTING_LAYER_PRIORITY.plugin).toBe(0);
    expect(SETTING_LAYER_PRIORITY.user).toBe(1);
    expect(SETTING_LAYER_PRIORITY.project).toBe(2);
    expect(SETTING_LAYER_PRIORITY.local).toBe(3);
    expect(SETTING_LAYER_PRIORITY.flag).toBe(4);
    expect(SETTING_LAYER_PRIORITY.policy).toBe(5);
  });
});

describe('getMergeStrategy', () => {
  it('policy → first-source-wins', () => {
    expect(getMergeStrategy('policy')).toBe('first-source-wins');
  });

  it('其他层 → last-source-wins', () => {
    const nonPolicy: SettingLayer[] = ['plugin', 'user', 'project', 'local', 'flag'];
    for (const layer of nonPolicy) {
      expect(getMergeStrategy(layer)).toBe('last-source-wins');
    }
  });
});

describe('settingLayerToRuleSource', () => {
  it('plugin → undefined（不产生规则）', () => {
    expect(settingLayerToRuleSource('plugin')).toBeUndefined();
  });

  it('user → user', () => {
    expect(settingLayerToRuleSource('user')).toBe('user');
  });

  it('project → project', () => {
    expect(settingLayerToRuleSource('project')).toBe('project');
  });

  it('local → local', () => {
    expect(settingLayerToRuleSource('local')).toBe('local');
  });

  it('flag → flag', () => {
    expect(settingLayerToRuleSource('flag')).toBe('flag');
  });

  it('policy → policy', () => {
    expect(settingLayerToRuleSource('policy')).toBe('policy');
  });
});
