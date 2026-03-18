'use client';

import { useState, useEffect } from 'react';

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 0) {
    // Future time (countdown)
    const absDiff = Math.abs(diff);
    if (absDiff < 1000) return 'now';
    if (absDiff < 60_000) return `in ${Math.floor(absDiff / 1000)}s`;
    if (absDiff < 3_600_000) return `in ${Math.floor(absDiff / 60_000)}m`;
    if (absDiff < 86_400_000) return `in ${Math.floor(absDiff / 3_600_000)}h`;
    return `in ${Math.floor(absDiff / 86_400_000)}d`;
  }

  if (diff < 1000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function RelativeTime({ timestamp }: { timestamp: number }) {
  const [text, setText] = useState(() => formatRelativeTime(timestamp));

  useEffect(() => {
    setText(formatRelativeTime(timestamp));
    const interval = setInterval(() => {
      setText(formatRelativeTime(timestamp));
    }, 5000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <span className="text-sm" style={{ color: 'var(--pacct-text-secondary)' }} title={new Date(timestamp).toISOString()}>
      {text}
    </span>
  );
}
