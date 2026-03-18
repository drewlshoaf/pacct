import { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes, forwardRef } from 'react';
import Link from 'next/link';

type ButtonBaseProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'teal';
  size?: 'sm' | 'md' | 'lg';
  mode?: 'dark' | 'light';
  className?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: never;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

// Dark mode variants (dashboard)
const darkVariantClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  teal: 'bg-coral-600 text-white hover:bg-coral-500 active:scale-95',
};

// Light mode variants (public pages and portal with dark mode support)
const lightVariantClasses = {
  primary: 'bg-stone-800 dark:bg-coral-600 text-white hover:bg-stone-700 dark:hover:bg-coral-500 active:scale-95 shadow-sm hover:shadow-md',
  secondary: 'bg-transparent text-stone-600 dark:text-stone-300 border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 hover:border-stone-400 dark:hover:border-stone-500 active:scale-95',
  ghost: 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 active:scale-95',
  outline: 'bg-transparent text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700 hover:border-stone-400 dark:hover:border-stone-500 active:scale-95',
  teal: 'bg-coral-600 text-white hover:bg-coral-500 active:scale-95 shadow-sm hover:shadow-md',
};

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      children,
      variant = 'primary',
      size = 'md',
      mode = 'dark',
      className = '',
      leftIcon,
      rightIcon,
      ...rest
    } = props;

    const variantClasses = mode === 'light' ? lightVariantClasses : darkVariantClasses;
    const baseClasses = mode === 'light'
      ? 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200'
      : 'btn';

    const combinedClassName = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

    const content = (
      <>
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </>
    );

    // If href is provided, render as a Link
    if ('href' in props && props.href) {
      const { href, target, rel } = rest as Omit<ButtonAsLink, keyof ButtonBaseProps> & { href: string };
      // Only pass Link-compatible props
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={combinedClassName}
          target={target}
          rel={rel}
        >
          {content}
        </Link>
      );
    }

    // Otherwise render as a button
    const buttonProps = rest as Omit<ButtonAsButton, keyof ButtonBaseProps>;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={combinedClassName}
        {...buttonProps}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
