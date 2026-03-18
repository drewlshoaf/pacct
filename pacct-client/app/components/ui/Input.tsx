import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  labelOptional?: string | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  mode?: 'dark' | 'light' | undefined;
  leftIcon?: ReactNode | undefined;
  rightIcon?: ReactNode | undefined;
}

// Dark mode styles (dashboard)
const darkInputClasses =
  'w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500 transition-colors';

// Light mode styles (public pages and portal with dark mode support)
const lightInputClasses =
  'w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl px-4 py-3 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-coral-500 dark:focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 dark:focus:ring-coral-500/30 transition-all';

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      labelOptional,
      error,
      hint,
      mode = 'dark',
      leftIcon,
      rightIcon,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const inputClasses = mode === 'light' ? lightInputClasses : darkInputClasses;
    const errorClasses = error
      ? mode === 'light'
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
        : 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : '';

    const labelClasses = mode === 'light'
      ? 'block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2'
      : 'block text-sm font-medium text-stone-300 mb-2';

    const errorTextClasses = mode === 'light'
      ? 'text-sm text-red-600 dark:text-red-400 mt-1'
      : 'text-sm text-red-400 mt-1';

    const hintTextClasses = mode === 'light'
      ? 'text-sm text-stone-500 dark:text-stone-400 mt-1'
      : 'text-sm text-stone-400 mt-1';

    return (
      <div className={className}>
        {label && (
          <label htmlFor={inputId} className={labelClasses}>
            {label}
            {labelOptional && (
              <span className="font-normal text-stone-400 ml-1">({labelOptional})</span>
            )}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`${inputClasses} ${errorClasses} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className={errorTextClasses}>{error}</p>}
        {hint && !error && <p className={hintTextClasses}>{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

// Textarea component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelOptional?: string;
  error?: string;
  hint?: string;
  mode?: 'dark' | 'light';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, labelOptional, error, hint, mode = 'dark', className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const textareaClasses = mode === 'light'
      ? 'w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl px-4 py-3 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 dark:focus:ring-coral-500/30 transition-all resize-none'
      : 'w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500 transition-colors resize-none';

    const errorClasses = error
      ? mode === 'light'
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
        : 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : '';

    const labelClasses = mode === 'light'
      ? 'block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2'
      : 'block text-sm font-medium text-stone-300 mb-2';

    const errorTextClasses = mode === 'light'
      ? 'text-sm text-red-600 dark:text-red-400 mt-1'
      : 'text-sm text-red-400 mt-1';

    const hintTextClasses = mode === 'light'
      ? 'text-sm text-stone-500 dark:text-stone-400 mt-1'
      : 'text-sm text-stone-400 mt-1';

    return (
      <div className={className}>
        {label && (
          <label htmlFor={inputId} className={labelClasses}>
            {label}
            {labelOptional && (
              <span className="font-normal text-stone-400 ml-1">({labelOptional})</span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`${textareaClasses} ${errorClasses}`}
          {...props}
        />
        {error && <p className={errorTextClasses}>{error}</p>}
        {hint && !error && <p className={hintTextClasses}>{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  mode?: 'dark' | 'light';
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, mode = 'dark', options, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const selectClasses = mode === 'light'
      ? 'w-full bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl px-4 py-3 text-stone-800 dark:text-stone-100 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20 dark:focus:ring-coral-500/30 transition-all cursor-pointer appearance-none'
      : 'w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500 transition-colors cursor-pointer appearance-none';

    const errorClasses = error
      ? mode === 'light'
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
        : 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : '';

    const labelClasses = mode === 'light'
      ? 'block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2'
      : 'block text-sm font-medium text-stone-300 mb-2';

    const errorTextClasses = mode === 'light'
      ? 'text-sm text-red-600 dark:text-red-400 mt-1'
      : 'text-sm text-red-400 mt-1';

    const hintTextClasses = mode === 'light'
      ? 'text-sm text-stone-500 dark:text-stone-400 mt-1'
      : 'text-sm text-stone-400 mt-1';

    return (
      <div className={className}>
        {label && (
          <label htmlFor={inputId} className={labelClasses}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={`${selectClasses} ${errorClasses}`}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        {error && <p className={errorTextClasses}>{error}</p>}
        {hint && !error && <p className={hintTextClasses}>{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
