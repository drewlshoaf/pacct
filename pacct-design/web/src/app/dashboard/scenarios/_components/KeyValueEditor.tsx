'use client';

export interface KVEntry {
  id: string;
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  entries: KVEntry[];
  onChange: (entries: KVEntry[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
  errors?: Record<string, string>;
}

export default function KeyValueEditor({
  entries,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  addLabel = 'Add Row',
  errors,
}: KeyValueEditorProps) {
  const add = () => {
    onChange([...entries, { id: crypto.randomUUID(), key: '', value: '' }]);
  };

  const update = (id: string, field: 'key' | 'value', val: string) => {
    onChange(entries.map(e => (e.id === id ? { ...e, [field]: val } : e)));
  };

  const remove = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
  };

  return (
    <div>
      {entries.length > 0 && (
        <div className="space-y-2 mb-2">
          {entries.map(entry => (
            <div key={entry.id}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={entry.key}
                  onChange={e => update(entry.id, 'key', e.target.value)}
                  placeholder={keyPlaceholder}
                  className="flex-1 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <span className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>:</span>
                <input
                  type="text"
                  value={entry.value}
                  onChange={e => update(entry.id, 'value', e.target.value)}
                  placeholder={valuePlaceholder}
                  className="flex-1 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <button
                  type="button"
                  onClick={() => remove(entry.id)}
                  className="p-1 rounded transition-colors hover:bg-[var(--rm-bg-raised)]"
                  style={{ color: 'var(--rm-text-muted)' }}
                  title="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              {errors?.[entry.id] && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[entry.id]}</p>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--rm-signal)', background: 'var(--rm-signal-glow)', border: '1px solid var(--rm-signal-glow)' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        {addLabel}
      </button>
    </div>
  );
}
