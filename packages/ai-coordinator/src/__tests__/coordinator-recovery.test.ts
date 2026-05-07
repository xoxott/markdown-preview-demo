import { describe, expect, it } from 'vitest';
import { persistCoordinatorState, recoverCoordinatorMode } from '../core/coordinator-recovery';
import type {
  CoordinatorStateStore,
  PersistedCoordinatorState
} from '../core/coordinator-recovery';

function createStore(
  initial?: PersistedCoordinatorState
): CoordinatorStateStore & { saved: PersistedCoordinatorState | null } {
  return {
    saved: initial ?? null,
    load() {
      return this.saved;
    },
    save(state) {
      this.saved = state;
    }
  };
}

describe('recoverCoordinatorMode', () => {
  it('no persisted data → default config', () => {
    const store = createStore();
    const config = recoverCoordinatorMode(store);
    expect(config.mode).toBe('single');
  });

  it('recovers coordinator mode', () => {
    const store = createStore({ mode: 'coordinator', lastActiveTime: Date.now() });
    const config = recoverCoordinatorMode(store);
    expect(config.mode).toBe('coordinator');
  });

  it('recovers single mode', () => {
    const store = createStore({ mode: 'single', lastActiveTime: Date.now() });
    const config = recoverCoordinatorMode(store);
    expect(config.mode).toBe('single');
  });

  it('stale coordinator → falls back to single', () => {
    const store = createStore({
      mode: 'coordinator',
      lastActiveTime: Date.now() - 4000000
    });
    const config = recoverCoordinatorMode(store);
    expect(config.mode).toBe('single');
  });

  it('recent coordinator → stays coordinator', () => {
    const store = createStore({
      mode: 'coordinator',
      lastActiveTime: Date.now() - 100000
    });
    const config = recoverCoordinatorMode(store);
    expect(config.mode).toBe('coordinator');
  });

  it('custom default config', () => {
    const store = createStore();
    const config = recoverCoordinatorMode(store, { mode: 'coordinator' });
    expect(config.mode).toBe('coordinator');
  });
});

describe('persistCoordinatorState', () => {
  it('saves current config', () => {
    const store = createStore();
    persistCoordinatorState({ mode: 'coordinator', scratchpadDir: '/tmp/sp' }, store);
    expect(store.saved?.mode).toBe('coordinator');
    expect(store.saved?.scratchpadDir).toBe('/tmp/sp');
    expect(store.saved?.lastActiveTime).toBeGreaterThan(0);
  });
});
