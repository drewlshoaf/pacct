'use client';

import type {
  AdvancedConfig,
  ConnectionConfig,
  ProtocolConfig,
  NetworkConfig,
  ObservabilityConfig,
} from '../../types';
import { create_default_advanced } from '../../types';
import ConnectionSection from './ConnectionSection';
import ProtocolSection from './ProtocolSection';
import NetworkSection from './NetworkSection';
import ObservabilitySection from './ObservabilitySection';

interface AdvancedTabProps {
  config: AdvancedConfig | undefined;
  onConnectionChange: (connection: ConnectionConfig) => void;
  onProtocolChange: (protocol: ProtocolConfig) => void;
  onNetworkChange: (network: NetworkConfig) => void;
  onObservabilityChange: (observability: ObservabilityConfig) => void;
}

export default function AdvancedTab({
  config,
  onConnectionChange,
  onProtocolChange,
  onNetworkChange,
  onObservabilityChange,
}: AdvancedTabProps) {
  const defaults = create_default_advanced();
  const resolved = config ?? defaults;

  return (
    <div className="p-5 space-y-4">
      <ConnectionSection
        config={resolved.connection}
        onChange={onConnectionChange}
      />
      <ProtocolSection
        config={resolved.protocol}
        onChange={onProtocolChange}
      />
      <NetworkSection
        config={resolved.network}
        onChange={onNetworkChange}
      />
      <ObservabilitySection
        config={resolved.observability}
        onChange={onObservabilityChange}
      />
    </div>
  );
}
