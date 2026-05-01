/** AttachmentRebuilder 测试 — Post-compact 附件重建 */

import { describe, expect, it } from 'vitest';
import type { UserMessage } from '@suga/ai-agent-loop';
import { AttachmentRebuilder } from '../core/AttachmentRebuilder';
import type { AttachmentFile, AttachmentRebuildConfig, AttachmentSkill } from '../types/attachment';

describe('AttachmentRebuilder', () => {
  describe('files 附件', () => {
    it('应重建 files 附件消息', () => {
      const files: AttachmentFile[] = [
        { path: '/src/main.ts', content: 'console.log("hello")', lastModified: Date.now() }
      ];
      const config: AttachmentRebuildConfig = { getRecentFiles: () => files };
      const rebuilder = new AttachmentRebuilder(config);

      const result = rebuilder.rebuild();

      expect(result.typesRebuilt).toContain('files');
      expect(result.attachments.length).toBe(1);
      const msg = result.attachments[0] as UserMessage;
      expect(msg.content).toContain('<recent_files>');
      expect(msg.content).toContain('/src/main.ts');
      expect(msg.isMeta).toBe(true);
    });

    it('无 files 时不应重建', () => {
      const config: AttachmentRebuildConfig = { getRecentFiles: () => [] };
      const rebuilder = new AttachmentRebuilder(config);

      const result = rebuilder.rebuild();

      expect(result.typesRebuilt).not.toContain('files');
    });

    it('无 getRecentFiles 函数时不应重建', () => {
      const rebuilder = new AttachmentRebuilder({});

      const result = rebuilder.rebuild();

      expect(result.typesRebuilt).not.toContain('files');
    });
  });

  describe('skills 附件', () => {
    it('应重建 skills 附件消息', () => {
      const skills: AttachmentSkill[] = [{ name: 'commit', description: 'Create a git commit' }];
      const config: AttachmentRebuildConfig = { getActiveSkills: () => skills };
      const rebuilder = new AttachmentRebuilder(config);

      const result = rebuilder.rebuild();

      expect(result.typesRebuilt).toContain('skills');
      expect(result.attachments.length).toBe(1);
      const skillMsg = result.attachments[0] as UserMessage;
      expect(skillMsg.content).toContain('<active_skills>');
      expect(skillMsg.content).toContain('commit');
      expect(skillMsg.isMeta).toBe(true);
    });

    it('无 skills 时不应重建', () => {
      const config: AttachmentRebuildConfig = { getActiveSkills: () => [] };
      const rebuilder = new AttachmentRebuilder(config);

      const result = rebuilder.rebuild();

      expect(result.typesRebuilt).not.toContain('skills');
    });
  });

  describe('plan 附件', () => {
    it('应重建 plan 附件消息', () => {
      const config: AttachmentRebuildConfig = {
        getCurrentPlan: () => '1. Fix bug\n2. Add test\n3. Deploy'
      };
      const rebuilder = new AttachmentRebuilder(config);

      const result = rebuilder.rebuild();

      expect(result.typesRebuilt).toContain('plan');
      expect(result.attachments.length).toBe(1);
      const planMsg = result.attachments[0] as UserMessage;
      expect(planMsg.content).toContain('<current_plan>');
      expect(planMsg.isMeta).toBe(true);
    });

    it('getCurrentPlan 返回空字符串时不应重建', () => {
      const config: AttachmentRebuildConfig = { getCurrentPlan: () => '' };
      const rebuilder = new AttachmentRebuilder(config);

      const result = rebuilder.rebuild();

      expect(result.typesRebuilt).not.toContain('plan');
    });
  });

  describe('enabledTypes 过滤', () => {
    it('应只重建 enabledTypes 中指定的类型', () => {
      const config: AttachmentRebuildConfig = {
        enabledTypes: ['files'],
        getRecentFiles: () => [{ path: '/src/a.ts', content: 'code', lastModified: Date.now() }],
        getActiveSkills: () => [{ name: 'skill', description: 'desc' }]
      };
      const rebuilder = new AttachmentRebuilder(config);

      const result = rebuilder.rebuild();

      expect(result.typesRebuilt).toEqual(['files']);
      expect(result.typesRebuilt).not.toContain('skills');
    });
  });

  describe('默认行为', () => {
    it('无注入函数时应返回空结果', () => {
      const rebuilder = new AttachmentRebuilder();

      const result = rebuilder.rebuild();

      expect(result.attachments.length).toBe(0);
      expect(result.typesRebuilt.length).toBe(0);
    });
  });
});
