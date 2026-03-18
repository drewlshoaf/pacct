import { ReactNode, forwardRef, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  mode?: 'dark' | 'light';
  variant?: 'default' | 'elevated' | 'bordered';
  className?: string;
}

// Dark mode styles (dashboard)
const darkVariantClasses = {
  default: 'bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-lg p-6',
  elevated: 'bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-lg',
  bordered: 'bg-transparent border border-stone-700 rounded-lg p-6',
};

// Light mode styles (public pages and portal with dark mode support)
const lightVariantClasses = {
  default: 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-card dark:shadow-none',
  elevated: 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-card-lg dark:shadow-lg',
  bordered: 'bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-2xl',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, mode = 'dark', variant = 'default', className = '', ...props }, ref) => {
    const variantClasses = mode === 'light' ? lightVariantClasses : darkVariantClasses;
    const padding = mode === 'light' ? 'p-8' : '';

    return (
      <div
        ref={ref}
        className={`${variantClasses[variant]} ${padding} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps {
  title: string | ReactNode;
  subtitle?: string;
  description?: string;
  action?: ReactNode;
  mode?: 'dark' | 'light';
  className?: string;
}

export function CardHeader({ title, subtitle, description, action, mode = 'dark', className = '' }: CardHeaderProps) {
  const titleClasses = mode === 'light'
    ? 'text-base font-bold text-stone-800 dark:text-stone-100 tracking-tight'
    : 'card-title';
  const subtitleClasses = mode === 'light'
    ? 'text-sm text-stone-600 dark:text-stone-400 mt-1'
    : 'text-sm text-stone-400 mt-1';

  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div>
        {typeof title === 'string' ? (
          <h3 className={titleClasses}>{title}</h3>
        ) : (
          title
        )}
        {subtitle && <p className={subtitleClasses}>{subtitle}</p>}
        {description && <p className={subtitleClasses}>{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  mode?: 'dark' | 'light';
  className?: string;
}

export function CardFooter({ children, mode = 'dark', className = '' }: CardFooterProps) {
  const borderClass = mode === 'light'
    ? 'border-t border-stone-100 dark:border-stone-700 pt-6 mt-6'
    : 'border-t border-stone-800 pt-4 mt-4';

  return (
    <div className={`${borderClass} ${className}`}>
      {children}
    </div>
  );
}
