import { describe, expect, it } from 'vitest';
import { InMemoryDiagnosticRegistry } from '../provider/InMemoryDiagnosticRegistry';
import type { DiagnosticEntry } from '../provider/InMemoryDiagnosticRegistry';

function makeEntry(
  filePath: string,
  severity: DiagnosticEntry['severity'],
  message: string
): DiagnosticEntry {
  return { filePath, severity, message, timestamp: Date.now() };
}

describe('InMemoryDiagnosticRegistry', () => {
  it('stores and retrieves diagnostics', () => {
    const registry = new InMemoryDiagnosticRegistry();
    registry.setBaseline('/a.ts', [
      makeEntry('/a.ts', 'error', 'Type error'),
      makeEntry('/a.ts', 'warning', 'Unused import')
    ]);
    expect(registry.get('/a.ts')).toHaveLength(2);
    expect(registry.size).toBe(2);
  });

  it('returns empty for unknown file', () => {
    const registry = new InMemoryDiagnosticRegistry();
    expect(registry.get('/unknown.ts')).toHaveLength(0);
  });

  it('detects added diagnostics', () => {
    const registry = new InMemoryDiagnosticRegistry();
    registry.setBaseline('/a.ts', [makeEntry('/a.ts', 'error', 'Old error')]);

    const changes = registry.detectChanges('/a.ts', [
      makeEntry('/a.ts', 'error', 'Old error'),
      makeEntry('/a.ts', 'warning', 'New warning')
    ]);

    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('added');
    expect(changes[0].diagnostic.message).toBe('New warning');
  });

  it('detects removed diagnostics', () => {
    const registry = new InMemoryDiagnosticRegistry();
    registry.setBaseline('/a.ts', [
      makeEntry('/a.ts', 'error', 'Error 1'),
      makeEntry('/a.ts', 'warning', 'Warning 1')
    ]);

    const changes = registry.detectChanges('/a.ts', [makeEntry('/a.ts', 'error', 'Error 1')]);

    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('removed');
    expect(changes[0].diagnostic.message).toBe('Warning 1');
  });

  it('detects both added and removed', () => {
    const registry = new InMemoryDiagnosticRegistry();
    registry.setBaseline('/a.ts', [
      makeEntry('/a.ts', 'error', 'Old error'),
      makeEntry('/a.ts', 'warning', 'Old warning')
    ]);

    const changes = registry.detectChanges('/a.ts', [
      makeEntry('/a.ts', 'error', 'Old error'),
      makeEntry('/a.ts', 'error', 'New error')
    ]);

    expect(changes).toHaveLength(2);
    expect(changes.some(c => c.type === 'added')).toBe(true);
    expect(changes.some(c => c.type === 'removed')).toBe(true);
  });

  it('no changes when identical', () => {
    const registry = new InMemoryDiagnosticRegistry();
    const entries = [makeEntry('/a.ts', 'error', 'Same error')];
    registry.setBaseline('/a.ts', entries);

    const changes = registry.detectChanges('/a.ts', entries);
    expect(changes).toHaveLength(0);
  });

  it('baselineTime updates on setBaseline', () => {
    const registry = new InMemoryDiagnosticRegistry();
    expect(registry.baselineTime).toBe(0);
    registry.setBaseline('/a.ts', [makeEntry('/a.ts', 'error', 'E')]);
    expect(registry.baselineTime).toBeGreaterThan(0);
  });

  it('reset clears everything', () => {
    const registry = new InMemoryDiagnosticRegistry();
    registry.setBaseline('/a.ts', [makeEntry('/a.ts', 'error', 'E')]);
    registry.reset();
    expect(registry.size).toBe(0);
    expect(registry.baselineTime).toBe(0);
    expect(registry.get('/a.ts')).toHaveLength(0);
  });
});
