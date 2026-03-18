import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscoveryClient } from '../discovery-client';
import type { NodeId, NetworkId, Vote } from '@pacct/protocol-ts';

describe('DiscoveryClient', () => {
  let client: DiscoveryClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    client = new DiscoveryClient('https://api.example.com');
  });

  function expectFetchCalledWith(path: string, opts?: Partial<RequestInit>) {
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.example.com${path}`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        ...opts,
      }),
    );
  }

  // Networks
  describe('networks', () => {
    it('registerNetwork POSTs to /networks', async () => {
      const params = {
        networkId: 'net1' as NetworkId,
        alias: 'Test',
        creatorNodeId: 'node1' as NodeId,
        manifest: {},
      };
      await client.registerNetwork(params);
      expectFetchCalledWith('/networks', { method: 'POST' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.networkId).toBe('net1');
    });

    it('listNetworks GETs /networks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });
      await client.listNetworks();
      expectFetchCalledWith('/networks');
    });

    it('listNetworks with filter appends query string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });
      await client.listNetworks({ status: 'active' });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/networks?status=active',
        expect.anything(),
      );
    });

    it('getNetwork GETs /networks/:id', async () => {
      await client.getNetwork('net1');
      expectFetchCalledWith('/networks/net1');
    });

    it('updateNetworkStatus PUTs to /networks/:id/status', async () => {
      await client.updateNetworkStatus('net1', 'active');
      expectFetchCalledWith('/networks/net1/status', { method: 'PUT' });
    });
  });

  // Members
  describe('members', () => {
    it('getMembers GETs /networks/:id/members', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });
      await client.getMembers('net1');
      expectFetchCalledWith('/networks/net1/members');
    });

    it('addMember POSTs to /networks/:id/members', async () => {
      await client.addMember('net1', 'node1', 1000);
      expectFetchCalledWith('/networks/net1/members', { method: 'POST' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.nodeId).toBe('node1');
      expect(body.joinedAt).toBe(1000);
    });

    it('updateMember PUTs to /networks/:id/members/:nodeId', async () => {
      await client.updateMember('net1', 'node1', { status: 'left' });
      expectFetchCalledWith('/networks/net1/members/node1', { method: 'PUT' });
    });
  });

  // Applicants
  describe('applicants', () => {
    it('submitApplication POSTs to /networks/:id/applicants', async () => {
      await client.submitApplication('net1', 'node2');
      expectFetchCalledWith('/networks/net1/applicants', { method: 'POST' });
    });

    it('getApplicants GETs /networks/:id/applicants', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });
      await client.getApplicants('net1');
      expectFetchCalledWith('/networks/net1/applicants');
    });

    it('getApplicant GETs /networks/:id/applicants/:nodeId', async () => {
      await client.getApplicant('net1', 'node2');
      expectFetchCalledWith('/networks/net1/applicants/node2');
    });

    it('updateApplicant PUTs to /networks/:id/applicants/:nodeId', async () => {
      await client.updateApplicant('net1', 'node2', { status: 'approved' });
      expectFetchCalledWith('/networks/net1/applicants/node2', { method: 'PUT' });
    });
  });

  // Votes
  describe('votes', () => {
    it('castVote POSTs to /networks/:id/applicants/:nodeId/votes', async () => {
      const vote = {
        voterNodeId: 'node1' as NodeId,
        vote: 'approve' as Vote,
        timestamp: Date.now(),
        signature: 'sig123',
      };
      await client.castVote('net1', 'node2', vote);
      expectFetchCalledWith('/networks/net1/applicants/node2/votes', {
        method: 'POST',
      });
    });

    it('getVotes GETs /networks/:id/applicants/:nodeId/votes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });
      await client.getVotes('net1', 'node2');
      expectFetchCalledWith('/networks/net1/applicants/node2/votes');
    });
  });

  // Manifests
  describe('manifests', () => {
    it('getManifests GETs /networks/:id/manifests', async () => {
      await client.getManifests('net1');
      expectFetchCalledWith('/networks/net1/manifests');
    });
  });

  // Presence
  describe('presence', () => {
    it('sendHeartbeat POSTs to /networks/:id/presence/heartbeat', async () => {
      await client.sendHeartbeat('net1', 'node1');
      expectFetchCalledWith('/networks/net1/presence/heartbeat', {
        method: 'POST',
      });
    });

    it('getPresence GETs /networks/:id/presence', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });
      await client.getPresence('net1');
      expectFetchCalledWith('/networks/net1/presence');
    });
  });

  // Events
  describe('events', () => {
    it('getEvents GETs /networks/:id/events', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });
      await client.getEvents('net1');
      expectFetchCalledWith('/networks/net1/events');
    });

    it('getEvents with opts appends query string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });
      await client.getEvents('net1', { limit: 10, offset: 5 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.anything(),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=5'),
        expect.anything(),
      );
    });
  });

  // Error handling
  describe('error handling', () => {
    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
        text: () => Promise.resolve('Not found'),
      });
      await expect(client.getNetwork('missing')).rejects.toThrow(
        'Discovery API error 404',
      );
    });
  });
});
