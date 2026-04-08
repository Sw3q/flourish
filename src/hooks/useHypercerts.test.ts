import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useHypercerts } from './useHypercerts';

// Mock @atproto/api
const mockAgent = {
  resolveHandle: vi.fn(),
  login: vi.fn(),
  com: {
    atproto: {
      repo: {
        createRecord: vi.fn(),
      },
    },
  },
  session: { did: 'did:plc:123' }
};

vi.mock('@atproto/api', () => ({
  BskyAgent: vi.fn(() => mockAgent)
}));

describe('useHypercerts Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve handle correctly', async () => {
    const mockDid = 'did:plc:123';
    mockAgent.resolveHandle.mockResolvedValueOnce({ data: { did: mockDid } });

    const { result } = renderHook(() => useHypercerts());
    let did;
    await act(async () => {
      did = await result.current.resolveHandle('test.bsky.social');
    });

    expect(did).toBe(mockDid);
    expect(mockAgent.resolveHandle).toHaveBeenCalledWith({ handle: 'test.bsky.social' });
  });

  it('should create hypercert correctly', async () => {
    const mockDid = 'did:plc:123';
    const mockUri = 'at://did:plc:123/org.hypercerts.claim.activity/abc';
    const mockCid = 'cid-123';

    mockAgent.login.mockResolvedValueOnce({});
    mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
      data: { uri: mockUri, cid: mockCid }
    });

    const { result } = renderHook(() => useHypercerts());
    const claim = {
      title: 'Test Impact',
      description: 'Test Description',
      shortDescription: 'Short',
      createdAt: new Date().toISOString(),
    };

    let hypercert;
    await act(async () => {
      hypercert = await result.current.createHypercert('test.bsky.social', 'password', claim);
    });

    expect(hypercert).toEqual({
      uri: mockUri,
      cid: mockCid,
      did: mockDid,
    });
    expect(mockAgent.login).toHaveBeenCalledWith({
      identifier: 'test.bsky.social',
      password: 'password',
    });
  });
  
  it('should include contributors in the record if provided', async () => {
    const mockDid = 'did:plc:123';
    mockAgent.login.mockResolvedValueOnce({});
    
    mockAgent.session = { did: mockDid };

    mockAgent.com.atproto.repo.createRecord.mockResolvedValueOnce({
      data: { uri: 'at://123', cid: 'cid-123' }
    });

    const { result } = renderHook(() => useHypercerts());
    const contributors = [
      { contributorIdentity: { identity: 'did:plc:creator' }, contributionDetails: { role: 'Fulfiller' } }
    ];

    await act(async () => {
      await result.current.createHypercert('test.bsky.social', 'password', {
        title: 'Test',
        description: 'Test',
        shortDescription: 'Short',
        createdAt: new Date().toISOString(),
        contributors
      });
    });

    expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        record: expect.objectContaining({
          contributors
        })
      })
    );
  });

  it('should handle creation errors', async () => {
    mockAgent.login.mockRejectedValueOnce(new Error('Auth failed'));

    const { result } = renderHook(() => useHypercerts());
    let hypercert;
    await act(async () => {
      hypercert = await result.current.createHypercert('test.bsky.social', 'bad-pass', {} as Parameters<typeof result.current.createHypercert>[2]);
    });

    expect(hypercert).toBeNull();
    expect(result.current.error).toBe('Auth failed');
  });
});
