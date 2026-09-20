import type { DemoState } from '../demo-context';

const STORAGE_KEY = 'rapidlink-demo-state-v1';

export interface DemoRepository {
  load(): DemoState | null;
  save(state: DemoState): void;
  clear(): void;
}

export const browserDemoRepository: DemoRepository = {
  load() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return value ? (JSON.parse(value) as DemoState) : null;
    } catch {
      return null;
    }
  },
  save(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The in-memory demo remains usable when storage is unavailable.
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing else is required when storage is unavailable.
    }
  },
};
