import { ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
  className?: string;
}

const variantClasses = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
};

const defaultIcons = {
  info: 'ℹ️',
  success: '✓',
  warning: '⚠️',
  error: '✕',
};

export default function Alert({ children, variant = 'info', icon, className = '' }: AlertProps) {
  const displayIcon = icon ?? defaultIcons[variant];

  return (
    <div className={`alert ${variantClasses[variant]} ${className}`}>
      {displayIcon && <span className="text-lg flex-shrink-0">{displayIcon}</span>}
      <div className="flex-1">{children}</div>
    </div>
  );
}
