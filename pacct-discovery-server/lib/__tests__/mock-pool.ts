import { vi } from 'vitest';

export function createMockPool() {
  const mockQuery = vi.fn();
  const mockConnect = vi.fn();
  const mockEnd = vi.fn();

  // Create a mock client for transaction support
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };

  mockConnect.mockResolvedValue(mockClient);

  const pool = {
    query: mockQuery,
    connect: mockConnect,
    end: mockEnd,
  } as any;

  return { pool, mockQuery, mockConnect, mockClient, mockEnd };
}
