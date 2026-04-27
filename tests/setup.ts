import { vi } from 'vitest';

// Mock Next.js server-only modules
vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
}));

// Suppress console.error in tests unless explicitly tested
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
    originalError(...args);
  };
});
afterAll(() => { console.error = originalError; });
