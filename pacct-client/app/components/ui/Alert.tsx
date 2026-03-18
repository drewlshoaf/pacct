'use client';

import { ReactNode, useState } from 'react';

interface AlertProps {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
  dismissible?: boolean;
  className?: string;
}

const variantClasses = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
};

const defaultIcons = {
  info: 'i',
  success: '\u2713',
  warning: '!',
  error: '\u2715',
};

export default function Alert({ children, variant = 'info', icon, dismissible = false, className = '' }: AlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const displayIcon = icon ?? defaultIcons[variant];

  return (
    <div className={`alert ${variantClasses[variant]} ${className}`}>
      {displayIcon && <span className="text-lg flex-shrink-0">{displayIcon}</span>}
      <div className="flex-1">{children}</div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
