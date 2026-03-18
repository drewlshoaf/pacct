'use client';

import type { CircuitBreakerConfig } from '@/hooks/useInfraStream';
import { ConfigCard, ConfigRow, NumberField, ToggleField, type StatusType, StatusToast } from './shared';

interface CircuitBreakerViewProps {
  cbConfig: CircuitBreakerConfig;
  updateCb: <K extends keyof CircuitBreakerConfig>(key: K, value: CircuitBreakerConfig[K]) => void;
  hasCbOverrides: boolean;
  cbStatus: StatusType;
  saveCb: () => void;
  resetCb: () => void;
  cbSaving: boolean;
}

export default function CircuitBreakerView({ cbConfig, updateCb, hasCbOverrides, cbStatus, saveCb, resetCb, cbSaving }: CircuitBreakerViewProps) {
  return (
    <ConfigCard title="Circuit Breaker" description="Auto-terminate runs when the target is unreachable or returning overwhelming errors">
      {cbStatus && <StatusToast status={cbStatus} />}

      <ConfigRow label="Enabled" description="Master switch — disable to let runs complete regardless of errors" badge="runtime">
        <ToggleField value={cbConfig.cb_enabled} onChange={v => updateCb('cb_enabled', v)} />
      </ConfigRow>
      <ConfigRow label="Error Rate Threshold" description="Error rate (%) above which a breach is recorded" badge="runtime">
        <NumberField value={cbConfig.cb_error_rate_threshold} onChange={v => updateCb('cb_error_rate_threshold', v)} unit="%" min={1} max={100} />
      </ConfigRow>
      <ConfigRow label="Consecutive Breaches" description="Number of consecutive 2s windows above threshold before tripping" badge="runtime">
        <NumberField value={cbConfig.cb_consecutive_breaches} onChange={v => updateCb('cb_consecutive_breaches', v)} unit="windows" min={1} max={20} />
      </ConfigRow>
      <ConfigRow label="No Response Timeout" description="Seconds with zero successful responses before aborting" badge="runtime">
        <NumberField value={cbConfig.cb_no_response_timeout_s} onChange={v => updateCb('cb_no_response_timeout_s', v)} unit="s" min={5} max={300} />
      </ConfigRow>
      <ConfigRow label="Min Requests" description="Minimum total requests before evaluating error rate" badge="runtime">
        <NumberField value={cbConfig.cb_min_requests} onChange={v => updateCb('cb_min_requests', v)} min={1} max={1000} />
      </ConfigRow>
      <ConfigRow label="Grace Period" description="Skip all checks during initial ramp-up" badge="runtime">
        <NumberField value={cbConfig.cb_grace_period_s} onChange={v => updateCb('cb_grace_period_s', v)} unit="s" min={0} max={120} />
      </ConfigRow>
      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--rm-border)' }}>
        <div className="flex items-center gap-2">
          {hasCbOverrides && (
            <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'rgba(217,164,65,0.12)', color: 'var(--rm-caution)' }}>Overrides active</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetCb} disabled={cbSaving} className="btn btn-ghost text-[12px]">Reset</button>
          <button onClick={saveCb} disabled={cbSaving} className="btn btn-primary text-[12px]">{cbSaving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </ConfigCard>
  );
}
