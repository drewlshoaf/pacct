'use client';

/**
 * Skeleton Loading Components
 * PORTAL-020: Loading States & Skeletons
 */

import { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  mode?: 'light' | 'dark';
}

/**
 * Base skeleton element with animation
 */
export function Skeleton({ className = '', mode = 'light' }: SkeletonProps) {
  const bgColor = mode === 'light' ? 'bg-stone-200' : 'bg-stone-700';

  return <div className={`animate-pulse rounded ${bgColor} ${className}`} />;
}

/**
 * Text line skeleton
 */
export function SkeletonText({
  lines = 1,
  widths,
  className = '',
  mode = 'light',
}: SkeletonProps & { lines?: number; widths?: string[] }) {
  const defaultWidths = ['w-full', 'w-4/5', 'w-3/4', 'w-2/3', 'w-1/2'];

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${widths?.[i] || defaultWidths[i % defaultWidths.length]}`}
          mode={mode}
        />
      ))}
    </div>
  );
}

/**
 * Circular skeleton (for avatars)
 */
export function SkeletonCircle({
  size = 'md',
  className = '',
  mode = 'light',
}: SkeletonProps & { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return <Skeleton className={`rounded-full ${sizes[size]} ${className}`} mode={mode} />;
}

/**
 * Card skeleton
 */
export function SkeletonCard({
  lines = 3,
  hasImage = false,
  hasActions = false,
  className = '',
  mode = 'light',
}: SkeletonProps & { lines?: number; hasImage?: boolean; hasActions?: boolean }) {
  const borderColor = mode === 'light' ? 'border-stone-200' : 'border-stone-700';
  const bgColor = mode === 'light' ? 'bg-white' : 'bg-stone-800';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-6 ${className}`}>
      {hasImage && (
        <Skeleton className="h-40 w-full mb-4 rounded-lg" mode={mode} />
      )}
      <Skeleton className="h-6 w-1/2 mb-4" mode={mode} />
      <SkeletonText lines={lines} mode={mode} />
      {hasActions && (
        <div className="flex gap-3 mt-6">
          <Skeleton className="h-9 w-24 rounded-lg" mode={mode} />
          <Skeleton className="h-9 w-24 rounded-lg" mode={mode} />
        </div>
      )}
    </div>
  );
}

/**
 * Table row skeleton
 */
export function SkeletonTableRow({
  columns = 4,
  className = '',
  mode = 'light',
}: SkeletonProps & { columns?: number }) {
  return (
    <div className={`flex items-center gap-4 py-4 ${className}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === 0 ? 'w-32' : 'flex-1'}`}
          mode={mode}
        />
      ))}
    </div>
  );
}

/**
 * Table skeleton
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
  mode = 'light',
}: SkeletonProps & { rows?: number; columns?: number }) {
  const borderColor = mode === 'light' ? 'border-stone-200' : 'border-stone-700';

  return (
    <div className={className}>
      <div className={`flex items-center gap-4 py-3 border-b ${borderColor}`}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" mode={mode} />
        ))}
      </div>
      <div className={`divide-y ${borderColor}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns} mode={mode} />
        ))}
      </div>
    </div>
  );
}

/**
 * List item skeleton
 */
export function SkeletonListItem({
  hasAvatar = true,
  hasActions = false,
  className = '',
  mode = 'light',
}: SkeletonProps & { hasAvatar?: boolean; hasActions?: boolean }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {hasAvatar && <SkeletonCircle mode={mode} />}
      <div className="flex-1">
        <Skeleton className="h-4 w-1/3 mb-2" mode={mode} />
        <Skeleton className="h-3 w-1/2" mode={mode} />
      </div>
      {hasActions && <Skeleton className="h-8 w-20 rounded-lg" mode={mode} />}
    </div>
  );
}

/**
 * List skeleton
 */
export function SkeletonList({
  items = 5,
  hasAvatar = true,
  hasActions = false,
  className = '',
  mode = 'light',
}: SkeletonProps & { items?: number; hasAvatar?: boolean; hasActions?: boolean }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem
          key={i}
          hasAvatar={hasAvatar}
          hasActions={hasActions}
          mode={mode}
        />
      ))}
    </div>
  );
}

/**
 * Stats card skeleton
 */
export function SkeletonStats({
  count = 4,
  className = '',
  mode = 'light',
}: SkeletonProps & { count?: number }) {
  const borderColor = mode === 'light' ? 'border-stone-200' : 'border-stone-700';
  const bgColor = mode === 'light' ? 'bg-white' : 'bg-stone-800';

  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${bgColor} border ${borderColor} rounded-xl p-4`}>
          <Skeleton className="h-3 w-20 mb-2" mode={mode} />
          <Skeleton className="h-8 w-16" mode={mode} />
        </div>
      ))}
    </div>
  );
}

/**
 * Chart skeleton
 */
export function SkeletonChart({
  height = 256,
  className = '',
  mode = 'light',
}: SkeletonProps & { height?: number }) {
  const bgColor = mode === 'light' ? 'bg-stone-100' : 'bg-stone-800/50';
  const textColor = mode === 'light' ? 'text-stone-400' : 'text-stone-500';

  return (
    <div
      className={`${bgColor} rounded-lg flex items-center justify-center animate-pulse ${className}`}
      style={{ height }}
    >
      <div className={textColor}>Loading chart...</div>
    </div>
  );
}

/**
 * Form field skeleton
 */
export function SkeletonFormField({
  hasLabel = true,
  className = '',
  mode = 'light',
}: SkeletonProps & { hasLabel?: boolean }) {
  return (
    <div className={className}>
      {hasLabel && <Skeleton className="h-4 w-24 mb-2" mode={mode} />}
      <Skeleton className="h-10 w-full rounded-lg" mode={mode} />
    </div>
  );
}

/**
 * Form skeleton
 */
export function SkeletonForm({
  fields = 3,
  hasActions = true,
  className = '',
  mode = 'light',
}: SkeletonProps & { fields?: number; hasActions?: boolean }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <SkeletonFormField key={i} mode={mode} />
      ))}
      {hasActions && (
        <div className="flex gap-3 pt-4">
          <Skeleton className="h-10 w-24 rounded-lg" mode={mode} />
          <Skeleton className="h-10 w-24 rounded-lg" mode={mode} />
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard page skeleton
 */
export function SkeletonDashboard({
  className = '',
  mode = 'light',
}: SkeletonProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats row */}
      <SkeletonStats count={4} mode={mode} />

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard lines={4} hasImage mode={mode} />
        <SkeletonCard lines={4} hasImage mode={mode} />
      </div>

      {/* Activity section */}
      <SkeletonList items={5} hasAvatar hasActions mode={mode} />
    </div>
  );
}

/**
 * Inline loading spinner
 */
export function LoadingSpinner({
  size = 'md',
  className = '',
  mode = 'light',
}: SkeletonProps & { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const color = mode === 'light' ? 'text-coral-600' : 'text-coral-400';

  return (
    <svg
      className={`animate-spin ${sizes[size]} ${color} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Full page loading overlay
 */
export function LoadingOverlay({
  message = 'Loading...',
  mode = 'light',
}: SkeletonProps & { message?: string }) {
  const bgColor = mode === 'light' ? 'bg-white/90' : 'bg-stone-900/90';
  const textColor = mode === 'light' ? 'text-stone-600' : 'text-stone-300';

  return (
    <div className={`fixed inset-0 ${bgColor} flex items-center justify-center z-50`}>
      <div className="text-center">
        <LoadingSpinner size="lg" mode={mode} />
        <p className={`mt-4 ${textColor}`}>{message}</p>
      </div>
    </div>
  );
}

/**
 * Button loading state
 */
export function ButtonLoading({
  children,
  isLoading,
  loadingText,
  mode = 'light',
}: {
  children: ReactNode;
  isLoading: boolean;
  loadingText?: string;
  mode?: 'light' | 'dark';
}) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2">
        <LoadingSpinner size="sm" mode={mode} />
        {loadingText || 'Loading...'}
      </span>
    );
  }

  return <>{children}</>;
}

/**
 * Certificates page skeleton
 * WEB-12: Loading skeleton for certificates list
 */
export function SkeletonCertificatesPage({ mode = 'light' }: SkeletonProps) {
  const borderColor = mode === 'light' ? 'border-stone-200' : 'border-stone-700';
  const bgColor = mode === 'light' ? 'bg-white' : 'bg-stone-800';
  const headerBg = mode === 'light' ? 'bg-stone-50' : 'bg-stone-800';

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className={`flex gap-4 border-b pb-3 ${borderColor}`}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-20" mode={mode} />
        ))}
      </div>
      {/* Table */}
      <div className={`${bgColor} border ${borderColor} rounded-xl overflow-hidden`}>
        <div className={`${headerBg} border-b ${borderColor}`}>
          <div className="flex items-center gap-4 px-4 py-3">
            {['Hash', 'Model', 'Status', 'Published', ''].map((_, i) => (
              <div key={i} className={i === 4 ? 'w-16' : 'flex-1'}>
                <Skeleton className="h-3 w-16" mode={mode} />
              </div>
            ))}
          </div>
        </div>
        <div className={`divide-y ${borderColor}`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="flex-1">
                <Skeleton className="h-4 w-32" mode={mode} />
              </div>
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" mode={mode} />
                <Skeleton className="h-3 w-16" mode={mode} />
              </div>
              <div className="flex-1">
                <Skeleton className="h-6 w-16 rounded-full" mode={mode} />
              </div>
              <div className="flex-1">
                <Skeleton className="h-4 w-20 mb-1" mode={mode} />
                <Skeleton className="h-3 w-16" mode={mode} />
              </div>
              <div className="w-16">
                <Skeleton className="h-8 w-14 rounded-lg" mode={mode} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Models page skeleton
 * WEB-12: Loading skeleton for models grid
 */
export function SkeletonModelsPage({ mode = 'light' }: SkeletonProps) {
  const borderColor = mode === 'light' ? 'border-stone-200' : 'border-stone-700';
  const bgColor = mode === 'light' ? 'bg-white' : 'bg-stone-800';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className={`${bgColor} border ${borderColor} rounded-xl p-6`}>
          <div className="flex items-start justify-between mb-4">
            <Skeleton className="w-12 h-12 rounded-xl" mode={mode} />
            <Skeleton className="w-16 h-6 rounded-full" mode={mode} />
          </div>
          <Skeleton className="h-5 w-32 mb-2" mode={mode} />
          <Skeleton className="h-4 w-24 mb-4" mode={mode} />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" mode={mode} />
            <Skeleton className="h-4 w-24" mode={mode} />
          </div>
          <div className={`mt-4 pt-4 border-t ${borderColor} flex gap-2`}>
            <Skeleton className="h-9 flex-1 rounded-lg" mode={mode} />
            <Skeleton className="h-9 w-28 rounded-lg" mode={mode} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Keys page skeleton
 * WEB-12: Loading skeleton for signing keys and API tokens
 */
export function SkeletonKeysPage({ mode = 'light' }: SkeletonProps) {
  const borderColor = mode === 'light' ? 'border-stone-200' : 'border-stone-700';
  const bgColor = mode === 'light' ? 'bg-white' : 'bg-stone-800';

  const renderKeyList = (count: number) => (
    <div className={`divide-y ${borderColor}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="w-10 h-10 rounded-lg" mode={mode} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-4 w-28" mode={mode} />
              <Skeleton className="h-5 w-14 rounded-full" mode={mode} />
            </div>
            <Skeleton className="h-3 w-48" mode={mode} />
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-24 mb-1" mode={mode} />
            <Skeleton className="h-3 w-20" mode={mode} />
          </div>
          <Skeleton className="h-8 w-16 rounded-lg" mode={mode} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Signing Keys */}
      <div className={`${bgColor} border ${borderColor} rounded-xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div>
            <Skeleton className="h-5 w-28 mb-1" mode={mode} />
            <Skeleton className="h-3 w-64" mode={mode} />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" mode={mode} />
        </div>
        {renderKeyList(3)}
      </div>
      {/* API Tokens */}
      <div className={`${bgColor} border ${borderColor} rounded-xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div>
            <Skeleton className="h-5 w-24 mb-1" mode={mode} />
            <Skeleton className="h-3 w-56" mode={mode} />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" mode={mode} />
        </div>
        {renderKeyList(2)}
      </div>
    </div>
  );
}

/**
 * Analytics page skeleton
 * WEB-12: Loading skeleton for analytics dashboard
 */
export function SkeletonAnalyticsPage({ mode = 'light' }: SkeletonProps) {
  const borderColor = mode === 'light' ? 'border-stone-200' : 'border-stone-700';
  const bgColor = mode === 'light' ? 'bg-white' : 'bg-stone-800';

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" mode={mode} />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-xl" mode={mode} />
          ))}
        </div>
      </div>
      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`${bgColor} border ${borderColor} rounded-xl`}>
            <div className="px-6 py-4 border-b border-stone-200">
              <Skeleton className="h-5 w-40 mb-1" mode={mode} />
              <Skeleton className="h-3 w-56" mode={mode} />
            </div>
            <div className="p-6">
              <SkeletonChart height={200} mode={mode} />
            </div>
          </div>
        ))}
      </div>
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`${bgColor} border ${borderColor} rounded-xl p-4`}>
            <Skeleton className="h-4 w-24 mb-2" mode={mode} />
            <Skeleton className="h-8 w-16 mb-1" mode={mode} />
            <Skeleton className="h-3 w-32" mode={mode} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Settings page skeleton
 * WEB-12: Loading skeleton for settings pages
 */
export function SkeletonSettingsPage({ mode = 'light' }: SkeletonProps) {
  const borderColor = mode === 'light' ? 'border-stone-200' : 'border-stone-700';
  const bgColor = mode === 'light' ? 'bg-white' : 'bg-stone-800';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        <div className={`${bgColor} border ${borderColor} rounded-xl`}>
          <div className="px-6 py-4 border-b border-stone-200">
            <Skeleton className="h-5 w-36" mode={mode} />
          </div>
          <div className="p-6 space-y-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" mode={mode} />
                <Skeleton className="h-12 w-full rounded-xl" mode={mode} />
              </div>
            ))}
          </div>
          <div className={`px-6 py-4 border-t ${borderColor} flex justify-end`}>
            <Skeleton className="h-10 w-32 rounded-xl" mode={mode} />
          </div>
        </div>
      </div>
      {/* Sidebar */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${bgColor} border ${borderColor} rounded-xl`}>
            <div className="px-6 py-4 border-b border-stone-200">
              <Skeleton className="h-5 w-28" mode={mode} />
            </div>
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-20" mode={mode} />
                  <Skeleton className="h-4 w-24" mode={mode} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
