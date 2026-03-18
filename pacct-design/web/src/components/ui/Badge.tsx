import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'teal';
  mode?: 'dark' | 'light';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

// Dark mode variants (dashboard)
const darkVariantClasses = {
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  neutral: 'badge-neutral',
  teal: 'bg-coral-500/10 text-coral-400 border border-coral-500/20',
};

// Light mode variants (public pages) - based on design file
const lightVariantClasses = {
  success: 'bg-blue-50 text-blue-700 border border-blue-200',
  warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  neutral: 'bg-stone-100 text-stone-600 border border-stone-200',
  teal: 'bg-coral-50 text-coral-700 border border-coral-200',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function Badge({
  children,
  variant = 'neutral',
  mode = 'dark',
  size = 'md',
  dot = false,
  className = '',
}: BadgeProps) {
  const variantClasses = mode === 'light' ? lightVariantClasses : darkVariantClasses;
  const baseClasses = 'inline-flex items-center gap-1.5 rounded-full font-medium';

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'success' ? 'bg-blue-500' :
            variant === 'warning' ? 'bg-yellow-500' :
            variant === 'error' ? 'bg-red-500' :
            variant === 'info' ? 'bg-blue-500' :
            variant === 'teal' ? 'bg-coral-500' :
            'bg-stone-400'
          }`}
        />
      )}
      {children}
    </span>
  );
}

// Special badge for hero section (attestation badge from design)
interface HeroBadgeProps {
  children: ReactNode;
  className?: string;
}

export function HeroBadge({ children, className = '' }: HeroBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-coral-50 border border-coral-200 rounded-full text-sm text-coral-700 ${className}`}
    >
      <span className="w-2 h-2 bg-coral-500 rounded-full" />
      {children}
    </span>
  );
}
