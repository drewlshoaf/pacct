'use client';

import { ConfigCard, ConfigRow, SelectField, NumberField, StatusToast, type StatusType } from './shared';

// ─── Model options ───────────────────────────────────────────────────────────

const PROVIDER_OPTIONS = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI' },
];

const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  claude: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'o3-mini', label: 'o3-mini' },
  ],
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ModelConfig {
  provider: 'claude' | 'openai';
  model: string;
  delay_ms: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ModelConfigViewProps {
  config: ModelConfig;
  update: <K extends keyof ModelConfig>(key: K, value: ModelConfig[K]) => void;
  hasOverrides: boolean;
  status: StatusType;
}

export default function ModelConfigView({ config, update, hasOverrides, status }: ModelConfigViewProps) {
  const modelOptions = MODEL_OPTIONS[config.provider] ?? MODEL_OPTIONS.claude;

  const handleProviderChange = (provider: string) => {
    update('provider', provider as 'claude' | 'openai');
    // Auto-select the first model for the new provider
    const firstModel = MODEL_OPTIONS[provider]?.[0]?.value;
    if (firstModel) {
      update('model', firstModel);
    }
  };

  return (
    <div className="space-y-5">
      {status && <StatusToast status={status} />}

      <ConfigCard
        title="AI Model Selection"
        description="Choose the AI provider and model used for narrative generation and analysis. Changes apply to the next run."
      >
        <ConfigRow
          label="Provider"
          description="AI provider to use for narrative generation"
        >
          <SelectField
            value={config.provider}
            options={PROVIDER_OPTIONS}
            onChange={handleProviderChange}
          />
        </ConfigRow>

        <ConfigRow
          label="Model"
          description="Specific model to use for AI analysis"
        >
          <SelectField
            value={config.model}
            options={modelOptions}
            onChange={v => update('model', v)}
          />
        </ConfigRow>

        <ConfigRow
          label="API Delay"
          description="Minimum delay between API calls (throttling)"
        >
          <NumberField
            value={config.delay_ms}
            onChange={v => update('delay_ms', v)}
            unit="ms"
            min={0}
            max={60000}
          />
        </ConfigRow>
      </ConfigCard>

      {hasOverrides && (
        <div className="text-[12px] px-3 py-2 rounded-lg" style={{ background: 'rgba(217,164,65,0.08)', color: 'var(--rm-caution)' }}>
          Runtime overrides are active. The worker will use these settings instead of environment variables.
        </div>
      )}

      {/* Environment variable reference */}
      <ConfigCard
        title="Environment Variable Reference"
        description="These env vars provide the defaults when no runtime overrides are set."
      >
        <div className="space-y-2 text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>
          <div className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--rm-border)' }}>
            <code style={{ color: 'var(--rm-text-muted)' }}>LOADTOAD_MODEL</code>
            <span>{process.env.NEXT_PUBLIC_LOADTOAD_MODEL || 'not set (auto-detect)'}</span>
          </div>
          <div className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--rm-border)' }}>
            <code style={{ color: 'var(--rm-text-muted)' }}>LOADTOAD_DELAY_MS</code>
            <span>{process.env.NEXT_PUBLIC_LOADTOAD_DELAY_MS || 'not set (0)'}</span>
          </div>
          <div className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--rm-border)' }}>
            <code style={{ color: 'var(--rm-text-muted)' }}>ANTHROPIC_API_KEY</code>
            <span>{process.env.NEXT_PUBLIC_HAS_ANTHROPIC_KEY === 'true' ? 'configured' : 'not set'}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <code style={{ color: 'var(--rm-text-muted)' }}>OPENAI_API_KEY</code>
            <span>{process.env.NEXT_PUBLIC_HAS_OPENAI_KEY === 'true' ? 'configured' : 'not set'}</span>
          </div>
        </div>
      </ConfigCard>
    </div>
  );
}
