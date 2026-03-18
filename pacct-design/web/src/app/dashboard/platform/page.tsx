'use client';

import { useState, useEffect, useRef } from 'react';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import AdminTabNav, { type AdminTab } from '@/components/admin/AdminTabNav';
import {
  useInfraStream,
  type InjectorConfig,
  type CircuitBreakerConfig,
  type ModelConfig,
  type TopologyConfig,
} from '@/hooks/useInfraStream';
import { ConnectionIndicator, type StatusType } from '@/app/dashboard/infrastructure/_components/shared';
import OverviewView from '@/app/dashboard/infrastructure/_components/OverviewView';
import QueueBrowserView from '@/app/dashboard/infrastructure/_components/QueueBrowserView';
import ConfigurationView from '@/app/dashboard/infrastructure/_components/ConfigurationView';
import CircuitBreakerView from '@/app/dashboard/infrastructure/_components/CircuitBreakerView';
import ModelConfigView from '@/app/dashboard/infrastructure/_components/ModelConfigView';
import TopologyConfigView from '@/app/dashboard/infrastructure/_components/TopologyConfigView';

// ─── Tab definitions ────────────────────────────────────────────────────────

type TabId = 'overview' | 'queues' | 'runtime-config' | 'circuit-breaker' | 'ai-runtime' | 'topology';

const tabs: AdminTab[] = [
  { key: 'overview', label: 'Infrastructure Overview', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg> },
  { key: 'queues', label: 'Queue Browser', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
  { key: 'runtime-config', label: 'Runtime Configuration', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg> },
  { key: 'circuit-breaker', label: 'Circuit Breaker', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> },
  { key: 'ai-runtime', label: 'AI Runtime', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg> },
  { key: 'topology', label: 'Topology Display', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg> },
];

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PlatformPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Stream-driven state
  const { queues, workers, config: streamedConfig, hasOverrides: streamHasOverrides, cbConfig: streamedCbConfig, hasCbOverrides: streamHasCbOverrides, modelConfig: streamedModelConfig, hasModelOverrides: streamHasModelOverrides, topoConfig: streamedTopoConfig, hasTopoOverrides: streamHasTopoOverrides, connected } = useInfraStream();

  // Local editable config (initialized from stream, edited locally until saved)
  const [editConfig, setEditConfig] = useState<InjectorConfig | null>(null);
  const [hasOverrides, setHasOverrides] = useState(false);
  const [editCbConfig, setEditCbConfig] = useState<CircuitBreakerConfig | null>(null);
  const [hasCbOverrides, setHasCbOverrides] = useState(false);
  const [editModelConfig, setEditModelConfig] = useState<ModelConfig | null>(null);
  const [hasModelOverrides, setHasModelOverrides] = useState(false);
  const [editTopoConfig, setEditTopoConfig] = useState<TopologyConfig | null>(null);
  const [hasTopoOverrides, setHasTopoOverrides] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cbSaving, setCbSaving] = useState(false);
  const [modelSaving, setModelSaving] = useState(false);
  const [topoSaving, setTopoSaving] = useState(false);
  const [status, setStatus] = useState<StatusType>(null);
  const [cbStatus, setCbStatus] = useState<StatusType>(null);
  const [modelStatus, setModelStatus] = useState<StatusType>(null);
  const [topoStatus, setTopoStatus] = useState<StatusType>(null);
  const configDirty = useRef(false);
  const cbDirty = useRef(false);
  const modelDirty = useRef(false);
  const topoDirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modelSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed local edit state from the first streamed config
  const config = editConfig ?? streamedConfig;
  if (!editConfig && streamedConfig) {
    setEditConfig(streamedConfig);
    setHasOverrides(streamHasOverrides);
  }

  const cbConfig = editCbConfig ?? streamedCbConfig;
  if (!editCbConfig && streamedCbConfig) {
    setEditCbConfig(streamedCbConfig);
    setHasCbOverrides(streamHasCbOverrides);
  }

  const modelConfig = editModelConfig ?? streamedModelConfig;
  if (!editModelConfig && streamedModelConfig) {
    setEditModelConfig(streamedModelConfig);
    setHasModelOverrides(streamHasModelOverrides);
  }

  const topoConfig = editTopoConfig ?? streamedTopoConfig;
  if (!editTopoConfig && streamedTopoConfig) {
    setEditTopoConfig(streamedTopoConfig);
    setHasTopoOverrides(streamHasTopoOverrides);
  }

  const update = <K extends keyof InjectorConfig>(key: K, value: InjectorConfig[K]) => {
    setEditConfig(prev => prev ? { ...prev, [key]: value } : prev);
    configDirty.current = true;
  };

  const updateCb = <K extends keyof CircuitBreakerConfig>(key: K, value: CircuitBreakerConfig[K]) => {
    setEditCbConfig(prev => prev ? { ...prev, [key]: value } : prev);
    cbDirty.current = true;
  };

  const updateModel = <K extends keyof ModelConfig>(key: K, value: ModelConfig[K]) => {
    setEditModelConfig(prev => prev ? { ...prev, [key]: value } : prev);
    modelDirty.current = true;
  };

  const updateTopo = <K extends keyof TopologyConfig>(key: K, value: TopologyConfig[K]) => {
    setEditTopoConfig(prev => prev ? { ...prev, [key]: value } : prev);
    topoDirty.current = true;
  };

  // Auto-save injector config after 1.5s of inactivity
  useEffect(() => {
    if (!configDirty.current || !editConfig) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      configDirty.current = false;
      setSaving(true);
      setStatus(null);
      try {
        const res = await fetch('/api/admin/injectors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editConfig),
        });
        if (res.ok) {
          setStatus({ type: 'success', message: 'Configuration saved.' });
          setHasOverrides(true);
          setTimeout(() => setStatus(prev => prev?.type === 'success' ? null : prev), 3000);
        } else {
          const err = await res.json();
          setStatus({ type: 'error', message: err.error || 'Save failed' });
        }
      } catch {
        setStatus({ type: 'error', message: 'Network error — is the server running?' });
      }
      setSaving(false);
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [editConfig]);

  // Auto-save circuit breaker config after 1.5s of inactivity
  useEffect(() => {
    if (!cbDirty.current || !editCbConfig) return;
    if (cbSaveTimer.current) clearTimeout(cbSaveTimer.current);
    cbSaveTimer.current = setTimeout(async () => {
      cbDirty.current = false;
      setCbSaving(true);
      setCbStatus(null);
      try {
        const res = await fetch('/api/admin/circuit-breaker', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editCbConfig),
        });
        if (res.ok) {
          setCbStatus({ type: 'success', message: 'Circuit breaker config saved.' });
          setHasCbOverrides(true);
          setTimeout(() => setCbStatus(prev => prev?.type === 'success' ? null : prev), 3000);
        } else {
          const err = await res.json();
          setCbStatus({ type: 'error', message: err.error || 'Save failed' });
        }
      } catch {
        setCbStatus({ type: 'error', message: 'Network error' });
      }
      setCbSaving(false);
    }, 1500);
    return () => { if (cbSaveTimer.current) clearTimeout(cbSaveTimer.current); };
  }, [editCbConfig]);

  // Auto-save model config after 1.5s of inactivity
  useEffect(() => {
    if (!modelDirty.current || !editModelConfig) return;
    if (modelSaveTimer.current) clearTimeout(modelSaveTimer.current);
    modelSaveTimer.current = setTimeout(async () => {
      modelDirty.current = false;
      setModelSaving(true);
      setModelStatus(null);
      try {
        const res = await fetch('/api/admin/models', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editModelConfig),
        });
        if (res.ok) {
          setModelStatus({ type: 'success', message: 'Model configuration saved.' });
          setHasModelOverrides(true);
          setTimeout(() => setModelStatus(prev => prev?.type === 'success' ? null : prev), 3000);
        } else {
          const err = await res.json();
          setModelStatus({ type: 'error', message: err.error || 'Save failed' });
        }
      } catch {
        setModelStatus({ type: 'error', message: 'Network error' });
      }
      setModelSaving(false);
    }, 1500);
    return () => { if (modelSaveTimer.current) clearTimeout(modelSaveTimer.current); };
  }, [editModelConfig]);

  // Auto-save topology config after 1.5s of inactivity
  useEffect(() => {
    if (!topoDirty.current || !editTopoConfig) return;
    if (topoSaveTimer.current) clearTimeout(topoSaveTimer.current);
    topoSaveTimer.current = setTimeout(async () => {
      topoDirty.current = false;
      setTopoSaving(true);
      setTopoStatus(null);
      try {
        const res = await fetch('/api/admin/topology', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editTopoConfig),
        });
        if (res.ok) {
          setTopoStatus({ type: 'success', message: 'Topology config saved.' });
          setHasTopoOverrides(true);
          setTimeout(() => setTopoStatus(prev => prev?.type === 'success' ? null : prev), 3000);
        } else {
          const err = await res.json();
          setTopoStatus({ type: 'error', message: err.error || 'Save failed' });
        }
      } catch {
        setTopoStatus({ type: 'error', message: 'Network error' });
      }
      setTopoSaving(false);
    }, 1500);
    return () => { if (topoSaveTimer.current) clearTimeout(topoSaveTimer.current); };
  }, [editTopoConfig]);

  const saveCb = async () => {
    if (!editCbConfig) return;
    setCbSaving(true);
    setCbStatus(null);
    try {
      const res = await fetch('/api/admin/circuit-breaker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCbConfig),
      });
      if (res.ok) {
        setCbStatus({ type: 'success', message: 'Circuit breaker config saved. Changes apply to the next run.' });
        setHasCbOverrides(true);
      } else {
        const err = await res.json();
        setCbStatus({ type: 'error', message: err.error || 'Save failed' });
      }
    } catch {
      setCbStatus({ type: 'error', message: 'Network error' });
    }
    setCbSaving(false);
  };

  const resetCb = async () => {
    setCbSaving(true);
    setCbStatus(null);
    try {
      const res = await fetch('/api/admin/circuit-breaker', { method: 'DELETE' });
      if (res.ok) {
        setCbStatus({ type: 'success', message: 'Reset to defaults.' });
        setHasCbOverrides(false);
        setEditCbConfig(null);
      }
    } catch {
      setCbStatus({ type: 'error', message: 'Reset failed' });
    }
    setCbSaving(false);
  };

  const saveTopo = async () => {
    if (!editTopoConfig) return;
    setTopoSaving(true);
    setTopoStatus(null);
    try {
      const res = await fetch('/api/admin/topology', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTopoConfig),
      });
      if (res.ok) {
        setTopoStatus({ type: 'success', message: 'Topology config saved. Changes apply immediately.' });
        setHasTopoOverrides(true);
      } else {
        const err = await res.json();
        setTopoStatus({ type: 'error', message: err.error || 'Save failed' });
      }
    } catch {
      setTopoStatus({ type: 'error', message: 'Network error' });
    }
    setTopoSaving(false);
  };

  const resetTopo = async () => {
    setTopoSaving(true);
    setTopoStatus(null);
    try {
      const res = await fetch('/api/admin/topology', { method: 'DELETE' });
      if (res.ok) {
        setTopoStatus({ type: 'success', message: 'Reset to defaults.' });
        setHasTopoOverrides(false);
        setEditTopoConfig(null);
      }
    } catch {
      setTopoStatus({ type: 'error', message: 'Reset failed' });
    }
    setTopoSaving(false);
  };

  const save = async () => {
    if (!editConfig) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/injectors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editConfig),
      });
      if (res.ok) {
        setStatus({ type: 'success', message: 'Configuration saved. Changes apply to the next run.' });
        setHasOverrides(true);
      } else {
        const err = await res.json();
        setStatus({ type: 'error', message: err.error || 'Save failed' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error — is the server running?' });
    }
    setSaving(false);
  };

  const reset = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/injectors', { method: 'DELETE' });
      if (res.ok) {
        setStatus({ type: 'success', message: 'Reset to env var defaults.' });
        setHasOverrides(false);
        setEditConfig(null);
      }
    } catch {
      setStatus({ type: 'error', message: 'Reset failed' });
    }
    setSaving(false);
  };

  // Loading state
  if (!config) {
    return (
      <PortalLayout>
        <PageHeader title="Platform" description="Platform operations and runtime configuration" />
        <div className="card text-center py-12">
          <p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>Connecting to infrastructure stream...</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <PageHeader
        title="Platform"
        description="Platform operations and runtime configuration"
        actions={
          <div className="flex items-center gap-3">
            <ConnectionIndicator connected={connected} />
            {saving && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--rm-text-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                Saving...
              </span>
            )}
            {!saving && status?.type === 'success' && (
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--rm-pass)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                Saved
              </span>
            )}
            {hasOverrides && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg font-medium"
                style={{ background: 'rgba(217,164,65,0.12)', color: 'var(--rm-caution)' }}>
                Runtime overrides active
              </span>
            )}
            <button onClick={reset} disabled={saving} className="btn btn-ghost text-[13px]">Reset Defaults</button>
            <button onClick={save} disabled={saving} className="btn btn-primary text-[13px]">
              {saving ? 'Saving...' : 'Save Config'}
            </button>
          </div>
        }
      />

      <div className="flex gap-6">
        <AdminTabNav tabs={tabs} activeTab={activeTab} onTabChange={key => setActiveTab(key as TabId)} />

        <div className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <OverviewView config={config} queues={queues} workers={workers} connected={connected} />
          )}

          {activeTab === 'queues' && (
            <QueueBrowserView stats={queues} />
          )}

          {activeTab === 'runtime-config' && (
            <ConfigurationView config={config} update={update} hasOverrides={hasOverrides} status={status} />
          )}

          {activeTab === 'circuit-breaker' && cbConfig && (
            <CircuitBreakerView
              cbConfig={cbConfig}
              updateCb={updateCb}
              hasCbOverrides={hasCbOverrides}
              cbStatus={cbStatus}
              saveCb={saveCb}
              resetCb={resetCb}
              cbSaving={cbSaving}
            />
          )}

          {activeTab === 'circuit-breaker' && !cbConfig && (
            <div className="card text-center py-8">
              <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>Waiting for circuit breaker configuration...</p>
            </div>
          )}

          {activeTab === 'ai-runtime' && modelConfig && (
            <ModelConfigView
              config={modelConfig}
              update={updateModel}
              hasOverrides={hasModelOverrides}
              status={modelStatus}
            />
          )}

          {activeTab === 'ai-runtime' && !modelConfig && (
            <div className="card text-center py-8">
              <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>Waiting for model configuration...</p>
            </div>
          )}

          {activeTab === 'topology' && topoConfig && (
            <TopologyConfigView
              config={topoConfig}
              update={updateTopo}
              hasOverrides={hasTopoOverrides}
              status={topoStatus}
              save={saveTopo}
              reset={resetTopo}
              saving={topoSaving}
            />
          )}

          {activeTab === 'topology' && !topoConfig && (
            <div className="card text-center py-8">
              <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>Waiting for topology configuration...</p>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
