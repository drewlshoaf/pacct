'use client';

/**
 * Empty State Component
 * Reusable empty state for list pages
 */

import { ReactNode } from 'react';

import { Card, CardContent } from '@/app/components/ui/Card';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  mode?: 'light' | 'dark';
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  mode = 'light',
}: EmptyStateProps) {
  const defaultIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );

  return (
    <Card mode={mode}>
      <CardContent>
        <div className="text-center py-16">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            mode === 'light' ? 'bg-stone-100 text-stone-400' : 'bg-stone-800 text-stone-500'
          }`}>
            {icon || defaultIcon}
          </div>
          <h3 className={`text-xl font-semibold mb-2 ${
            mode === 'light' ? 'text-stone-800' : 'text-stone-100'
          }`}>
            {title}
          </h3>
          <p className={`mb-6 max-w-sm mx-auto ${
            mode === 'light' ? 'text-stone-500' : 'text-stone-400'
          }`}>
            {description}
          </p>
          {action && <div>{action}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// Pre-defined empty states for PACCT concepts

export function EmptyStateNetworks({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="3" />
          <circle cx="5" cy="19" r="3" />
          <circle cx="19" cy="19" r="3" />
          <line x1="12" y1="8" x2="5" y2="16" />
          <line x1="12" y1="8" x2="19" y2="16" />
        </svg>
      }
      title="No networks yet"
      description="Create or join a computation network to start privacy-preserving analytics."
      action={action}
    />
  );
}

export function EmptyStateSpecs({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      }
      title="No specs created"
      description="Design a computation spec to define what analytics your network will compute."
      action={action}
    />
  );
}

export function EmptyStateMembers({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      }
      title="No members"
      description="Invite members to join your computation network and contribute data."
      action={action}
    />
  );
}

export function EmptyStateRuns({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      }
      title="No computation runs"
      description="Start a computation run to execute your analytics spec across the network."
      action={action}
    />
  );
}

export function EmptyStateSearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      }
      title="No results found"
      description={`No results found for "${query}". Try adjusting your search terms.`}
    />
  );
}
