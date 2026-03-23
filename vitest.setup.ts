import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase globally
vi.mock('./src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      signUp: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      })),
      unsubscribe: vi.fn()
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      insert: vi.fn()
    }))
  }
}));
