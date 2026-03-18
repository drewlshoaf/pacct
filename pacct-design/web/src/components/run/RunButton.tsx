'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRun } from '@/lib/run-api';
import DuplicateTargetWarning from './DuplicateTargetWarning';

interface RunButtonProps {
  scenarioId: string;
  scenarioBaseUrl?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  disabledReason?: string;
}

export default function RunButton({ scenarioId, scenarioBaseUrl, size = 'md', disabled, disabledReason }: RunButtonProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const sizeClasses = size === 'sm'
    ? 'text-[11px] px-2.5 py-1'
    : 'text-[13px] px-4 py-2';

  const executeRun = async () => {
    setStarting(true);
    setError(null);
    setShowDuplicateWarning(false);
    try {
      const result = await startRun(scenarioId);
      router.push(`/dashboard/live?awaiting=1&plan_run_id=${result.run_id}`);
    } catch (err) {
      setStarting(false);
      setError(err instanceof Error ? err.message : 'Failed to start run');
    }
  };

  const handleRun = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!scenarioBaseUrl) {
      // No base_url available — skip conflict check, proceed directly
      await executeRun();
      return;
    }

    // Check for duplicate targets among active runs
    try {
      const res = await fetch('/api/runs/active-targets');
      if (res.ok) {
        const { base_urls } = await res.json() as { base_urls: string[] };
        if (base_urls.includes(scenarioBaseUrl)) {
          setShowDuplicateWarning(true);
          return;
        }
      }
    } catch {
      // If check fails, proceed without warning
    }

    await executeRun();
  };

  if (error) {
    return (
      <span className="flex items-center gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <span className={`${sizeClasses} truncate`} style={{ color: 'var(--rm-fail)', maxWidth: 140 }} title={error}>{error}</span>
        <button
          type="button"
          onClick={handleRun}
          className={`${sizeClasses} rounded-md font-medium transition-colors`}
          style={{ background: 'var(--rm-border)', color: 'var(--rm-text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--rm-border-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--rm-border)'; }}
        >
          Retry
        </button>
      </span>
    );
  }

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className={`${sizeClasses} rounded-md font-medium cursor-not-allowed`}
        style={{ background: 'var(--rm-border)', color: 'var(--rm-text-muted)', opacity: 0.6 }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        title={disabledReason}
      >
        <span className="flex items-center gap-1.5">
          <PlayIcon size={size === 'sm' ? 10 : 12} />
          Run
        </span>
      </button>
    );
  }

  if (starting) {
    return (
      <button
        type="button"
        disabled
        className={`${sizeClasses} rounded-md font-medium cursor-wait`}
        style={{ background: 'var(--rm-border)', color: 'var(--rm-text-muted)' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <span className="flex items-center gap-1.5">
          <Spinner size={size === 'sm' ? 10 : 12} />
          Starting...
        </span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleRun}
        className={`${sizeClasses} rounded-md font-medium transition-colors`}
        style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--rm-signal)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--rm-signal)'; }}
      >
        <span className="flex items-center gap-1.5">
          <PlayIcon size={size === 'sm' ? 10 : 12} />
          Run
        </span>
      </button>
      {showDuplicateWarning && scenarioBaseUrl && (
        <DuplicateTargetWarning
          duplicateUrl={scenarioBaseUrl}
          count={2}
          onContinue={executeRun}
          onCancel={() => setShowDuplicateWarning(false)}
          loading={starting}
        />
      )}
    </>
  );
}

function PlayIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function Spinner({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
    </svg>
  );
}
