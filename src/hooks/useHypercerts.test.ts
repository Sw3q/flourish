import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useHypercerts } from './useHypercerts';
import { BskyAgent } from '@atproto/api';

// Mock @atproto/api
vi.mock('@atproto/api', () => {
  const mockCreateRecord = vi.fn();
  const BskyAgent = vi.fn(() => ({
    resolveHandle: vi.fn(),
    login: vi.fn(),
    com: {
      atproto: {
        repo: {
          createRecord: mockCreateRecord,
        },
      },
    },
    session: { did: 'did:plc:123' }
  }));
  return { BskyAgent };
});

describe('useHypercerts Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve handle correctly', async () => {
    const mockDid = 'did:plc:123';
    (BskyAgent.prototype.resolveHandle as any).mockResolvedValueOnce({ data: { did: mockDid } });

    const { result } = renderHook(() => useHypercerts());
    let did;
    await act(async () => {
      did = await result.current.resolveHandle('test.bsky.social');
    });

    expect(did).toBe(mockDid);
    expect(BskyAgent.prototype.resolveHandle).toHaveBeenCalledWith({ handle: 'test.bsky.social' });
  });

  it('should create hypercert correctly', async () => {
    const mockDid = 'did:plc:123';
    const mockUri = 'at://did:plc:123/org.hypercerts.claim.activity/abc';
    const mockCid = 'cid-123';

    // Mock the session getter
    const agentInstance = (BskyAgent as any).mock.results[0].value;
    agentInstance.login.mockResolvedValueOnce({});
    agentInstance.com.atproto.repo.createRecord.mockResolvedValueOnce({
      data: { uri: mockUri, cid: mockCid }
    });

    (BskyAgent.prototype.com.atproto.repo.createRecord as any).mockResolvedValueOnce({
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
    expect(BskyAgent.prototype.login).toHaveBeenCalledWith({
      identifier: 'test.bsky.social',
      password: 'password',
    });
  });
  
  it('should include contributors in the record if provided', async () => {
    const mockDid = 'did:plc:123';
    (BskyAgent.prototype.login as any).mockResolvedValueOnce({});
    Object.defineProperty(BskyAgent.prototype, 'session', {
      get: () => ({ did: mockDid }),
      configurable: true
    });

    (BskyAgent.prototype.com.atproto.repo.createRecord as any).mockResolvedValueOnce({
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

    expect(BskyAgent.prototype.com.atproto.repo.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        record: expect.objectContaining({
          contributors
        })
      })
    );
  });

  it('should handle creation errors', async () => {
    (BskyAgent.prototype.login as any).mockRejectedValueOnce(new Error('Auth failed'));

    const { result } = renderHook(() => useHypercerts());
    let hypercert;
    await act(async () => {
      hypercert = await result.current.createHypercert('test.bsky.social', 'bad-pass', {} as any);
    });

    expect(hypercert).toBeNull();
    expect(result.current.error).toBe('Auth failed');
  });
});
