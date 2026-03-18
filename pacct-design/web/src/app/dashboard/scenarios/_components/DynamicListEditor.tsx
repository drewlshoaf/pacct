'use client';

interface DynamicListEditorProps<T extends { id: string }> {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (
    item: T,
    index: number,
    update: <K extends keyof T>(field: K, value: T[K]) => void
  ) => React.ReactNode;
  createDefault: () => T;
  addLabel: string;
  emptyMessage?: string;
  reorderable?: boolean;
}

export default function DynamicListEditor<T extends { id: string }>({
  items,
  onChange,
  renderItem,
  createDefault,
  addLabel,
  emptyMessage,
  reorderable = false,
}: DynamicListEditorProps<T>) {
  const add = () => onChange([...items, createDefault()]);

  const remove = (id: string) => onChange(items.filter(item => item.id !== id));

  const move = (from: number, direction: -1 | 1) => {
    const to = from + direction;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  const updateItem = (id: string) => <K extends keyof T>(field: K, value: T[K]) => {
    onChange(items.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  return (
    <div>
      {items.length === 0 && emptyMessage && (
        <p className="text-[12px] py-3 text-center" style={{ color: 'var(--rm-text-muted)' }}>{emptyMessage}</p>
      )}
      {items.length > 0 && (
        <div className="space-y-2 mb-2">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-start gap-2">
              <div className="flex-1">{renderItem(item, i, updateItem(item.id))}</div>
              <div className="flex items-center gap-1 flex-shrink-0 pt-1">
                {reorderable && (
                  <>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="p-1 rounded transition-colors hover:bg-[var(--rm-bg-raised)] disabled:opacity-20 disabled:cursor-not-allowed"
                      style={{ color: 'var(--rm-text-muted)' }}
                      title="Move up"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1}
                      className="p-1 rounded transition-colors hover:bg-[var(--rm-bg-raised)] disabled:opacity-20 disabled:cursor-not-allowed"
                      style={{ color: 'var(--rm-text-muted)' }}
                      title="Move down"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="p-1 rounded transition-colors hover:bg-[var(--rm-bg-raised)]"
                  style={{ color: 'var(--rm-text-muted)' }}
                  title="Remove"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
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
