/** @suga/ai-tools — InMemorySkillProvider测试 */

import { describe, expect, it } from 'vitest';
import { InMemorySkillProvider } from '../provider/InMemorySkillProvider';

describe('InMemorySkillProvider', () => {
  it('findSkill(已注册) → 返回定义', async () => {
    const provider = new InMemorySkillProvider();
    provider.registerSkill({
      name: 'commit',
      description: 'Create a commit',
      prompt: 'Create a commit prompt'
    });
    const skill = await provider.findSkill('commit');
    expect(skill).not.toBeNull();
    expect(skill!.name).toBe('commit');
  });

  it('findSkill(未注册) → null', async () => {
    const provider = new InMemorySkillProvider();
    const skill = await provider.findSkill('nonexistent');
    expect(skill).toBeNull();
  });

  it('listSkills → 返回所有skill', async () => {
    const provider = new InMemorySkillProvider();
    provider.registerSkill({ name: 'commit', description: 'Commit', prompt: 'P1' });
    provider.registerSkill({ name: 'compact', description: 'Compact', prompt: 'P2' });
    const skills = await provider.listSkills();
    expect(skills.length).toBe(2);
  });

  it('removeSkill → 不再返回', async () => {
    const provider = new InMemorySkillProvider();
    provider.registerSkill({ name: 'commit', description: 'Commit', prompt: 'P1' });
    provider.removeSkill('commit');
    const skill = await provider.findSkill('commit');
    expect(skill).toBeNull();
  });

  it('reset → 清空所有skill', async () => {
    const provider = new InMemorySkillProvider();
    provider.registerSkill({ name: 'commit', description: 'Commit', prompt: 'P1' });
    provider.reset();
    const skills = await provider.listSkills();
    expect(skills).toEqual([]);
  });
});