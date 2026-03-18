'use client';

/**
 * Form Error Display Components
 * PORTAL-019: Form Validation & Error States
 */

interface FormErrorProps {
  message?: string;
  mode?: 'light' | 'dark';
  className?: string;
}

/**
 * Inline field error message
 */
export function FieldError({ message, mode = 'light', className = '' }: FormErrorProps) {
  if (!message) return null;

  const textColor = mode === 'light' ? 'text-red-600' : 'text-red-400';

  return (
    <p className={`text-sm ${textColor} mt-1 flex items-center gap-1.5 ${className}`} role="alert">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </p>
  );
}

interface FormErrorBannerProps {
  title?: string;
  message?: string;
  errors?: string[];
  mode?: 'light' | 'dark';
  className?: string;
  onDismiss?: () => void;
}

/**
 * Form-level error banner
 */
export function FormErrorBanner({
  title = 'There was a problem with your submission',
  message,
  errors = [],
  mode = 'light',
  className = '',
  onDismiss,
}: FormErrorBannerProps) {
  if (!message && errors.length === 0) return null;

  const bgColor = mode === 'light' ? 'bg-red-50' : 'bg-red-500/10';
  const borderColor = mode === 'light' ? 'border-red-200' : 'border-red-500/30';
  const titleColor = mode === 'light' ? 'text-red-800' : 'text-red-400';
  const textColor = mode === 'light' ? 'text-red-700' : 'text-red-300';
  const iconColor = mode === 'light' ? 'text-red-500' : 'text-red-400';
  const dismissColor = mode === 'light' ? 'text-red-500 hover:text-red-700' : 'text-red-400 hover:text-red-300';

  return (
    <div
      className={`${bgColor} border ${borderColor} rounded-lg p-4 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex">
        <div className={`flex-shrink-0 ${iconColor}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${titleColor}`}>{title}</h3>
          {message && <p className={`text-sm mt-1 ${textColor}`}>{message}</p>}
          {errors.length > 0 && (
            <ul className={`list-disc list-inside text-sm mt-2 space-y-1 ${textColor}`}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className={`flex-shrink-0 ml-3 ${dismissColor}`} aria-label="Dismiss error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface FormSuccessBannerProps {
  title?: string;
  message?: string;
  mode?: 'light' | 'dark';
  className?: string;
  onDismiss?: () => void;
}

/**
 * Form-level success banner
 */
export function FormSuccessBanner({
  title = 'Success!',
  message,
  mode = 'light',
  className = '',
  onDismiss,
}: FormSuccessBannerProps) {
  if (!title && !message) return null;

  const bgColor = mode === 'light' ? 'bg-blue-50' : 'bg-blue-500/10';
  const borderColor = mode === 'light' ? 'border-blue-200' : 'border-blue-500/30';
  const titleColor = mode === 'light' ? 'text-blue-800' : 'text-blue-400';
  const textColor = mode === 'light' ? 'text-blue-700' : 'text-blue-300';
  const iconColor = mode === 'light' ? 'text-blue-500' : 'text-blue-400';
  const dismissColor = mode === 'light' ? 'text-blue-500 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300';

  return (
    <div
      className={`${bgColor} border ${borderColor} rounded-lg p-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex">
        <div className={`flex-shrink-0 ${iconColor}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${titleColor}`}>{title}</h3>
          {message && <p className={`text-sm mt-1 ${textColor}`}>{message}</p>}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className={`flex-shrink-0 ml-3 ${dismissColor}`} aria-label="Dismiss">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface FormWarningBannerProps {
  title?: string;
  message?: string;
  mode?: 'light' | 'dark';
  className?: string;
  onDismiss?: () => void;
}

/**
 * Form-level warning banner
 */
export function FormWarningBanner({
  title,
  message,
  mode = 'light',
  className = '',
  onDismiss,
}: FormWarningBannerProps) {
  if (!title && !message) return null;

  const bgColor = mode === 'light' ? 'bg-yellow-50' : 'bg-yellow-500/10';
  const borderColor = mode === 'light' ? 'border-yellow-200' : 'border-yellow-500/30';
  const titleColor = mode === 'light' ? 'text-yellow-800' : 'text-yellow-400';
  const textColor = mode === 'light' ? 'text-yellow-700' : 'text-yellow-300';
  const iconColor = mode === 'light' ? 'text-yellow-500' : 'text-yellow-400';
  const dismissColor = mode === 'light' ? 'text-yellow-500 hover:text-yellow-700' : 'text-yellow-400 hover:text-yellow-300';

  return (
    <div
      className={`${bgColor} border ${borderColor} rounded-lg p-4 ${className}`}
      role="alert"
    >
      <div className="flex">
        <div className={`flex-shrink-0 ${iconColor}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          {title && <h3 className={`text-sm font-medium ${titleColor}`}>{title}</h3>}
          {message && <p className={`text-sm ${title ? 'mt-1' : ''} ${textColor}`}>{message}</p>}
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className={`flex-shrink-0 ml-3 ${dismissColor}`} aria-label="Dismiss warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface PasswordStrengthIndicatorProps {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  suggestions?: string[];
  mode?: 'light' | 'dark';
  className?: string;
}

/**
 * Password strength indicator
 */
export function PasswordStrengthIndicator({
  score,
  label,
  suggestions = [],
  mode = 'light',
  className = '',
}: PasswordStrengthIndicatorProps) {
  const colors = {
    0: mode === 'light' ? 'bg-red-500' : 'bg-red-400',
    1: mode === 'light' ? 'bg-red-500' : 'bg-red-400',
    2: mode === 'light' ? 'bg-yellow-500' : 'bg-yellow-400',
    3: mode === 'light' ? 'bg-blue-500' : 'bg-blue-400',
    4: mode === 'light' ? 'bg-blue-600' : 'bg-blue-500',
  };

  const labelColors = {
    0: mode === 'light' ? 'text-red-600' : 'text-red-400',
    1: mode === 'light' ? 'text-red-600' : 'text-red-400',
    2: mode === 'light' ? 'text-yellow-600' : 'text-yellow-400',
    3: mode === 'light' ? 'text-blue-600' : 'text-blue-400',
    4: mode === 'light' ? 'text-blue-700' : 'text-blue-500',
  };

  const textMuted = mode === 'light' ? 'text-stone-500' : 'text-stone-400';
  const barBg = mode === 'light' ? 'bg-stone-200' : 'bg-stone-700';

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs ${textMuted}`}>Password strength</span>
        <span className={`text-xs font-medium ${labelColors[score]}`}>{label}</span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index < score ? colors[score] : barBg
            }`}
          />
        ))}
      </div>
      {suggestions.length > 0 && (
        <ul className={`text-xs ${textMuted} mt-2 space-y-0.5`}>
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start gap-1">
              <span className="opacity-50">•</span>
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface RequiredMarkerProps {
  mode?: 'light' | 'dark';
}

/**
 * Required field marker (asterisk)
 */
export function RequiredMarker({ mode = 'light' }: RequiredMarkerProps) {
  const color = mode === 'light' ? 'text-red-500' : 'text-red-400';
  return <span className={color} aria-hidden="true">*</span>;
}

interface CharacterCountProps {
  current: number;
  max: number;
  mode?: 'light' | 'dark';
  className?: string;
}

/**
 * Character count display
 */
export function CharacterCount({ current, max, mode = 'light', className = '' }: CharacterCountProps) {
  const isOver = current > max;
  const isNear = current > max * 0.9;

  const textColor = isOver
    ? mode === 'light' ? 'text-red-600' : 'text-red-400'
    : isNear
    ? mode === 'light' ? 'text-yellow-600' : 'text-yellow-400'
    : mode === 'light' ? 'text-stone-500' : 'text-stone-400';

  return (
    <span className={`text-xs ${textColor} ${className}`}>
      {current}/{max}
    </span>
  );
}
