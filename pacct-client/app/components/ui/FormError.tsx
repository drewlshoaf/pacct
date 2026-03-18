'use client';

/**
 * Form Error Display Components
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

  const bgColor = mode === 'light' ? 'bg-green-50' : 'bg-green-500/10';
  const borderColor = mode === 'light' ? 'border-green-200' : 'border-green-500/30';
  const titleColor = mode === 'light' ? 'text-green-800' : 'text-green-400';
  const textColor = mode === 'light' ? 'text-green-700' : 'text-green-300';
  const iconColor = mode === 'light' ? 'text-green-500' : 'text-green-400';
  const dismissColor = mode === 'light' ? 'text-green-500 hover:text-green-700' : 'text-green-400 hover:text-green-300';

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
