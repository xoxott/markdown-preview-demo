import { describe, expect, it } from 'vitest';
import { discoverSkillsTool } from '../tools/discover-skills';
import { verifyPlanTool } from '../tools/verify-plan';

describe('discoverSkillsTool', () => {
  it('returns empty list when no provider', async () => {
    const result = await discoverSkillsTool.call({ query: undefined }, {});
    expect(result.data.skills).toEqual([]);
  });

  it('lists all skills from provider', async () => {
    const context = {
      skillProvider: {
        list: () => [
          { name: 'commit', description: 'Create git commits' },
          { name: 'review-pr', description: 'Review pull requests' }
        ]
      }
    };
    const result = await discoverSkillsTool.call({ query: undefined }, context);
    expect(result.data.skills).toHaveLength(2);
    expect(result.data.skills[0].name).toBe('commit');
  });

  it('filters skills by query', async () => {
    const context = {
      skillProvider: {
        list: () => [
          { name: 'commit', description: 'Create git commits' },
          { name: 'review-pr', description: 'Review pull requests' }
        ]
      }
    };
    const result = await discoverSkillsTool.call({ query: 'review' }, context);
    expect(result.data.skills).toHaveLength(1);
    expect(result.data.skills[0].name).toBe('review-pr');
  });

  it('no matching skills → empty', async () => {
    const context = {
      skillProvider: {
        list: () => [{ name: 'commit', description: 'Create git commits' }]
      }
    };
    const result = await discoverSkillsTool.call({ query: 'xyz' }, context);
    expect(result.data.skills).toHaveLength(0);
  });
});

describe('verifyPlanTool', () => {
  it('returns no plan when provider missing', async () => {
    const result = await verifyPlanTool.call({ planId: undefined }, {});
    expect(result.data.totalSteps).toBe(0);
    expect(result.data.allCompleted).toBe(false);
    expect(result.data.summary).toContain('No plan found');
  });

  it('verifies completed plan', async () => {
    const context = {
      planModeProvider: {
        getActivePlan: () => ({
          id: 'plan-1',
          steps: [
            { description: 'Step 1: Fix bug', completed: true },
            { description: 'Step 2: Add tests', completed: true }
          ]
        })
      }
    };
    const result = await verifyPlanTool.call({ planId: undefined }, context);
    expect(result.data.totalSteps).toBe(2);
    expect(result.data.completedSteps).toBe(2);
    expect(result.data.allCompleted).toBe(true);
    expect(result.data.summary).toContain('completed ✓');
  });

  it('verifies partially completed plan', async () => {
    const context = {
      planModeProvider: {
        getActivePlan: () => ({
          id: 'plan-2',
          steps: [
            { description: 'Step 1: Fix bug', completed: true },
            { description: 'Step 2: Add tests', completed: false }
          ]
        })
      }
    };
    const result = await verifyPlanTool.call({ planId: undefined }, context);
    expect(result.data.totalSteps).toBe(2);
    expect(result.data.completedSteps).toBe(1);
    expect(result.data.allCompleted).toBe(false);
    expect(result.data.summary).toContain('1/2');
  });

  it('no active plan → empty', async () => {
    const context = {
      planModeProvider: {
        getActivePlan: () => undefined
      }
    };
    const result = await verifyPlanTool.call({ planId: undefined }, context);
    expect(result.data.totalSteps).toBe(0);
  });
});
