'use client';

export interface ToggleOption<T extends string = string> {
  value: T;
  label: string;
  color?: string;
  description?: string;
}

interface ToggleButtonGroupProps<T extends string = string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'pill' | 'card';
  size?: 'sm' | 'md';
}

export default function ToggleButtonGroup<T extends string = string>({
  options,
  value,
  onChange,
  variant = 'pill',
  size = 'md',
}: ToggleButtonGroupProps<T>) {
  if (variant === 'card') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map(opt => {
          const active = opt.value === value;
          const color = opt.color || 'var(--rm-signal)';
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="text-left px-3 py-2.5 rounded-lg transition-colors"
              style={{
                background: active ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
                border: `1px solid ${active ? 'var(--rm-border-hover)' : 'var(--rm-border)'}`,
              }}
            >
              <div
                className="text-[12px] font-semibold"
                style={{ color: active ? color : 'var(--rm-text-secondary)' }}
              >
                {opt.label}
              </div>
              {opt.description && (
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
                  {opt.description}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // pill variant
  const isSm = size === 'sm';
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const active = opt.value === value;
        const color = opt.color || 'var(--rm-signal)';
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`${isSm ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'} font-mono font-semibold rounded-lg transition-colors`}
            style={{
              background: active ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
              color: active ? color : 'var(--rm-text-secondary)',
              border: `1px solid ${active ? 'var(--rm-border-hover)' : 'var(--rm-border)'}`,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
