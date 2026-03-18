import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'active' | 'degraded' | 'dissolved' | 'pending' | 'draft';
  mode?: 'dark' | 'light';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

// Dark mode variants (dashboard)
const darkVariantClasses: Record<string, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  neutral: 'badge-neutral',
  active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  degraded: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  dissolved: 'bg-stone-500/10 text-stone-400 border border-stone-500/20',
  pending: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  draft: 'bg-stone-500/10 text-stone-500 border border-stone-600/20',
};

// Light mode variants
const lightVariantClasses: Record<string, string> = {
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  neutral: 'bg-stone-100 text-stone-600 border border-stone-200',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  degraded: 'bg-amber-50 text-amber-700 border border-amber-200',
  dissolved: 'bg-stone-100 text-stone-500 border border-stone-300',
  pending: 'bg-blue-50 text-blue-700 border border-blue-200',
  draft: 'bg-stone-50 text-stone-500 border border-stone-200',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

const dotColors: Record<string, string> = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-stone-400',
  active: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  dissolved: 'bg-stone-400',
  pending: 'bg-blue-500',
  draft: 'bg-stone-400',
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
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
