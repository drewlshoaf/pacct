'use client';

interface DuplicateTargetWarningProps {
  duplicateUrl: string;
  count: number;
  onContinue: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DuplicateTargetWarning({
  duplicateUrl,
  count,
  onContinue,
  onCancel,
  loading,
}: DuplicateTargetWarningProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
        {/* Warning icon */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(217,164,65,0.12)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--rm-caution)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>
            Multiple runs targeting the same environment
          </h3>
        </div>

        <p className="text-[13px] mb-3" style={{ color: 'var(--rm-text-secondary)' }}>
          You are about to run {count} tests against the same target:
        </p>

        <div
          className="rounded-lg px-3 py-2 mb-4 font-mono text-[12px] truncate"
          style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', color: 'var(--rm-caution)' }}
          title={duplicateUrl}
        >
          {duplicateUrl}
        </div>

        <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>
          Running concurrent tests against the same target can interfere with performance results,
          make metrics harder to interpret, and produce misleading outcomes.
        </p>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)', border: '1px solid var(--rm-border)' }}
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            disabled={loading}
            className="text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors"
            style={{ background: 'var(--rm-caution)', color: '#000', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Starting...' : 'Continue Anyway'}
          </button>
        </div>
      </div>
    </div>
  );
}
