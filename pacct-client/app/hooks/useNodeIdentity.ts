'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { NodeIdentity } from '@pacct/protocol-ts';
import { NodeIdentityManager } from '@/lib/identity/node-identity-manager';
import { MemoryAdapter } from '@/lib/persistence/memory-adapter';

interface UseNodeIdentityReturn {
  identity: NodeIdentity | null;
  nodeId: string | null;
  loading: boolean;
  error: string | null;
  copyNodeId: () => Promise<void>;
  regenerateKeypair: () => Promise<void>;
}

// Singleton adapter + manager so identity persists across re-renders
const sharedAdapter = new MemoryAdapter();
const sharedManager = new NodeIdentityManager(sharedAdapter);

/**
 * Hook to manage node identity.
 * Uses the real NodeIdentityManager with a MemoryAdapter.
 */
export function useNodeIdentity(): UseNodeIdentityReturn {
  const [identity, setIdentity] = useState<NodeIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const id = await sharedManager.initialize();
        setIdentity(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize identity');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyNodeId = useCallback(async () => {
    if (identity?.nodeId) {
      await navigator.clipboard.writeText(identity.nodeId);
    }
  }, [identity]);

  const regenerateKeypair = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Clear stored keys and re-initialize to generate fresh keypair
      await sharedAdapter.delete('node-keypair');
      await sharedAdapter.delete('node-identity');
      const freshManager = new NodeIdentityManager(sharedAdapter);
      const id = await freshManager.initialize();
      setIdentity(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate keypair');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    identity,
    nodeId: identity?.nodeId ?? null,
    loading,
    error,
    copyNodeId,
    regenerateKeypair,
  };
}
