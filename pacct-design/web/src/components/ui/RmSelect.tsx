'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────

export interface RmSelectOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
}

interface RmSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: RmSelectOption[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  menuMinWidth?: string;
  className?: string;
}

// ─── Chevron icon ───────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      className="flex-shrink-0 transition-transform duration-150"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <path
        d="M2.5 3.75L5 6.25L7.5 3.75"
        stroke="var(--rm-text-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Check icon (selected indicator) ────────────────────────────────────

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────

export default function RmSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchable = false,
  disabled = false,
  size = 'md',
  menuMinWidth,
  className = '',
}: RmSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusIndex, setFocusIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Current label
  const selectedOption = options.find(o => o.value === value);
  const displayLabel = selectedOption?.label ?? placeholder;

  // Filtered options
  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      o.description?.toLowerCase().includes(q)
    );
  }, [options, search]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
        setFocusIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus search input when menu opens
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open, searchable]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-rm-option]');
      items[focusIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusIndex]);

  const selectOption = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
    setSearch('');
    setFocusIndex(-1);
  }, [onChange]);

  // Keyboard handling
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setFocusIndex(filtered.findIndex(o => o.value === value));
        } else if (focusIndex >= 0 && focusIndex < filtered.length) {
          selectOption(filtered[focusIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setSearch('');
        setFocusIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setFocusIndex(filtered.findIndex(o => o.value === value));
        } else {
          setFocusIndex(prev => (prev + 1) % filtered.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) {
          setFocusIndex(prev => (prev - 1 + filtered.length) % filtered.length);
        }
        break;
    }
  }, [disabled, open, focusIndex, filtered, value, selectOption]);

  // Size tokens
  const isSm = size === 'sm';
  const triggerPadding = isSm ? '6px 26px 6px 10px' : '8px 28px 8px 12px';
  const triggerFontSize = isSm ? '12px' : '13px';
  const itemPadding = isSm ? '5px 10px' : '7px 12px';
  const itemFontSize = isSm ? '12px' : '13px';

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* ── Trigger ──────────────────────────────────────────────── */}
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            if (!open) {
              setFocusIndex(filtered.findIndex(o => o.value === value));
            } else {
              setSearch('');
              setFocusIndex(-1);
            }
          }
        }}
        style={{
          width: '100%',
          background: 'var(--rm-bg-raised)',
          border: `1px solid ${open ? 'var(--rm-signal)' : 'var(--rm-border)'}`,
          borderRadius: '8px',
          padding: triggerPadding,
          color: selectedOption ? 'var(--rm-text)' : 'var(--rm-text-muted)',
          fontSize: triggerFontSize,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          textAlign: 'left',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: open ? '0 0 0 2px var(--rm-signal-glow)' : 'none',
          outline: 'none',
        }}
        onMouseEnter={e => {
          if (!open && !disabled) {
            e.currentTarget.style.borderColor = 'var(--rm-border-hover)';
          }
        }}
        onMouseLeave={e => {
          if (!open && !disabled) {
            e.currentTarget.style.borderColor = 'var(--rm-border)';
          }
        }}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.color && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: selectedOption.color }}
            />
          )}
          {displayLabel}
        </span>

        {/* Chevron (absolutely positioned) */}
        <span
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ right: isSm ? '8px' : '10px' }}
        >
          <Chevron open={open} />
        </span>
      </button>

      {/* ── Menu ─────────────────────────────────────────────────── */}
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: menuMinWidth ? undefined : 0,
            minWidth: menuMinWidth,
            marginTop: '4px',
            background: 'var(--rm-bg-surface)',
            border: '1px solid var(--rm-border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {/* Search input */}
          {searchable && (
            <div style={{ padding: '8px 8px 4px' }}>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setFocusIndex(0);
                }}
                onKeyDown={e => {
                  // Let container handle arrow/enter/escape, but don't bubble for regular typing
                  if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                    e.stopPropagation();
                  }
                }}
                placeholder="Search..."
                style={{
                  width: '100%',
                  background: 'var(--rm-bg-raised)',
                  border: '1px solid var(--rm-border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: 'var(--rm-text)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Options list */}
          <div
            ref={listRef}
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
              padding: '4px 0',
            }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '16px 12px',
                  textAlign: 'center',
                  color: 'var(--rm-text-muted)',
                  fontSize: '12px',
                }}
              >
                No results
              </div>
            ) : (
              filtered.map((option, i) => {
                const isSelected = option.value === value;
                const isFocused = i === focusIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-rm-option
                    onClick={() => selectOption(option.value)}
                    onMouseEnter={() => setFocusIndex(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: itemPadding,
                      margin: '0 4px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: itemFontSize,
                      color: isSelected ? 'var(--rm-signal)' : 'var(--rm-text)',
                      background: isFocused
                        ? 'var(--rm-bg-raised)'
                        : isSelected
                          ? 'var(--rm-signal-glow)'
                          : 'transparent',
                      transition: 'background 0.1s',
                      // Make items slightly narrower to account for margin
                      width: 'calc(100% - 8px)',
                    }}
                  >
                    {option.color && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: option.color }}
                      />
                    )}
                    <span className="flex-1 truncate">
                      {option.label}
                      {option.description && (
                        <span
                          className="ml-1.5"
                          style={{ color: 'var(--rm-text-muted)', fontSize: '11px' }}
                        >
                          {option.description}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
