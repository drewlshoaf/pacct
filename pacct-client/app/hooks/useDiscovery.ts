'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  NetworkState,
  MemberInfo,
  ApplicantInfo,
  RunSummary,
  PacctEvent,
} from '@pacct/protocol-ts';
import {
  getMockNetworks,
  getMockNetworkDetail,
  getMockMembers,
  getMockApplicants,
  getMockRuns,
  getMockRunDetail,
  getMockEvents,
  getMockDiscoverableNetworks,
  getMockDiscoverableNetworkDetail,
  getMockPresence,
  type DiscoverableNetwork,
} from '@/lib/mock/mock-data';
import type { NetworkId, NodeId, Timestamp, Hash } from '@pacct/protocol-ts';
import { NetworkStatus } from '@pacct/protocol-ts';
import {
  DiscoveryClient,
  type NetworkInfo,
} from '@/lib/discovery/discovery-client';

const DISCOVERY_SERVER_URL =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>).__PACCT_DISCOVERY_URL__ as string | undefined) ??
      process.env.NEXT_PUBLIC_DISCOVERY_URL ??
      'http://localhost:3001'
    : process.env.NEXT_PUBLIC_DISCOVERY_URL ?? 'http://localhost:3001';

const discoveryClient = new DiscoveryClient(DISCOVERY_SERVER_URL);

async function fetchWithFallback<T>(fetcher: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await fetcher();
  } catch {
    return fallback();
  }
}

// ── useNetworks ──

export function useNetworks() {
  const [networks, setNetworks] = useState<NetworkState[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchWithFallback(
      async () => {
        const infos = await discoveryClient.listNetworks();
        return infos.map(networkInfoToState);
      },
      () => getMockNetworks(),
    ).then((data) => {
      setNetworks(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { networks, loading, refresh };
}

// ── useNetworkDetail ──

export function useNetworkDetail(networkId: string | null) {
  const [network, setNetwork] = useState<NetworkState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!networkId) {
      setNetwork(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWithFallback(
      async () => {
        const info = await discoveryClient.getNetwork(networkId);
        return networkInfoToState(info);
      },
      () => getMockNetworkDetail(networkId),
    ).then((data) => {
      setNetwork(data);
      setLoading(false);
    });
  }, [networkId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { network, loading, refresh };
}

// ── useMembers ──

export function useMembers(networkId: string | null) {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!networkId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    fetchWithFallback(
      () => discoveryClient.getMembers(networkId),
      () => getMockMembers(networkId),
    ).then((data) => {
      setMembers(data);
      setLoading(false);
    });
  }, [networkId]);

  return { members, loading };
}

// ── useApplicants ──

export function useApplicants(networkId: string | null) {
  const [applicants, setApplicants] = useState<ApplicantInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!networkId) {
      setApplicants([]);
      setLoading(false);
      return;
    }
    fetchWithFallback(
      () => discoveryClient.getApplicants(networkId),
      () => getMockApplicants(networkId),
    ).then((data) => {
      setApplicants(data);
      setLoading(false);
    });
  }, [networkId]);

  return { applicants, loading };
}

// ── useRuns ──

export function useRuns(networkId: string | null) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!networkId) {
      setRuns([]);
      setLoading(false);
      return;
    }
    // No discovery endpoint for runs yet; use mock
    setTimeout(() => {
      setRuns(getMockRuns(networkId));
      setLoading(false);
    }, 200);
  }, [networkId]);

  return { runs, loading };
}

// ── useRunDetail ──

export function useRunDetail(networkId: string | null, runId: string | null) {
  const [run, setRun] = useState<RunSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!networkId || !runId) {
      setRun(null);
      setLoading(false);
      return;
    }
    setTimeout(() => {
      setRun(getMockRunDetail(networkId, runId));
      setLoading(false);
    }, 200);
  }, [networkId, runId]);

  return { run, loading };
}

// ── useEvents ──

export function useEvents(networkId?: string) {
  const [events, setEvents] = useState<PacctEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!networkId) {
      setTimeout(() => {
        setEvents(getMockEvents(networkId));
        setLoading(false);
      }, 200);
      return;
    }
    fetchWithFallback(
      async () => {
        const evts = await discoveryClient.getEvents(networkId);
        return evts as PacctEvent[];
      },
      () => getMockEvents(networkId),
    ).then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, [networkId]);

  return { events, loading };
}

// ── useDiscoverableNetworks ──

export function useDiscoverableNetworks() {
  const [networks, setNetworks] = useState<DiscoverableNetwork[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchWithFallback(
      async () => {
        const infos = await discoveryClient.listNetworks();
        return infos.map(networkInfoToDiscoverable);
      },
      () => getMockDiscoverableNetworks(),
    ).then((data) => {
      setNetworks(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { networks, loading, refresh };
}

// ── useDiscoverableNetworkDetail ──

export function useDiscoverableNetworkDetail(networkId: string | null) {
  const [network, setNetwork] = useState<DiscoverableNetwork | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!networkId) {
      setNetwork(null);
      setLoading(false);
      return;
    }
    fetchWithFallback(
      async () => {
        const info = await discoveryClient.getNetwork(networkId);
        return networkInfoToDiscoverable(info);
      },
      () => getMockDiscoverableNetworkDetail(networkId),
    ).then((data) => {
      setNetwork(data);
      setLoading(false);
    });
  }, [networkId]);

  return { network, loading };
}

// ── usePresence ──

export function usePresence(networkId: string | null) {
  const [presence, setPresence] = useState<{ nodeId: string; online: boolean; lastSeen: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!networkId) {
      setPresence([]);
      setLoading(false);
      return;
    }
    fetchWithFallback(
      async () => {
        const data = await discoveryClient.getPresence(networkId);
        return data.map((p) => ({ nodeId: p.nodeId as string, online: p.online, lastSeen: p.lastSeen as number }));
      },
      () => getMockPresence(networkId),
    ).then((data) => {
      setPresence(data);
      setLoading(false);
    });
  }, [networkId]);

  return { presence, loading };
}

// ── Helpers ──

const emptyHash = '' as Hash;

function networkInfoToState(info: NetworkInfo): NetworkState {
  return {
    networkId: info.networkId,
    alias: info.alias,
    status: (info.status as NetworkStatus) ?? NetworkStatus.Draft,
    creatorNodeId: info.creatorNodeId,
    members: [],
    applicants: [],
    manifest: {
      networkId: info.networkId,
      schemaManifestHash: emptyHash,
      computationManifestHash: emptyHash,
      governanceManifestHash: emptyHash,
      economicManifestHash: emptyHash,
      createdAt: info.createdAt,
      creatorNodeId: info.creatorNodeId,
      signature: '',
    },
    createdAt: info.createdAt,
    runHistory: [],
  };
}

function networkInfoToDiscoverable(info: NetworkInfo): DiscoverableNetwork {
  return {
    networkId: info.networkId,
    alias: info.alias,
    status: info.status,
    creatorNodeId: info.creatorNodeId,
    createdAt: info.createdAt as number,
    memberCount: 0,
    visibilityMode: 'full',
  };
}
