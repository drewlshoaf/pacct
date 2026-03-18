const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 604_800_000;

/**
 * Format milliseconds into a human-readable duration string.
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0 seconds';

  const weeks = Math.floor(ms / MS_PER_WEEK);
  const days = Math.floor((ms % MS_PER_WEEK) / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((ms % MS_PER_MINUTE) / 1000);

  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks} week${weeks !== 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

  return parts.join(', ') || '0 seconds';
}

const DURATION_REGEX = /(\d+)\s*(s(?:ec(?:ond)?s?)?|m(?:in(?:ute)?s?)?|h(?:(?:ou)?rs?)?|d(?:ays?)?|w(?:eeks?)?)/gi;

/**
 * Parse a human-readable duration string into milliseconds.
 * Supports: "2 hours", "30 minutes", "7 days", "1h 30m", etc.
 */
export function parseDuration(input: string): number {
  let totalMs = 0;
  let match: RegExpExecArray | null;

  // Reset regex
  DURATION_REGEX.lastIndex = 0;

  while ((match = DURATION_REGEX.exec(input)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (unit.startsWith('w')) {
      totalMs += value * MS_PER_WEEK;
    } else if (unit.startsWith('d')) {
      totalMs += value * MS_PER_DAY;
    } else if (unit.startsWith('h')) {
      totalMs += value * MS_PER_HOUR;
    } else if (unit.startsWith('m')) {
      totalMs += value * MS_PER_MINUTE;
    } else if (unit.startsWith('s')) {
      totalMs += value * 1000;
    }
  }

  // If no matches found, try parsing as plain number (assume ms)
  if (totalMs === 0 && input.trim()) {
    const plain = parseInt(input.trim(), 10);
    if (!isNaN(plain)) return plain;
  }

  return totalMs;
}

/**
 * Format epoch milliseconds to a readable date string.
 */
export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
